package com.cephadex.ambi.auth.service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.config.AuthProperties;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import tools.jackson.databind.json.JsonMapper;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * Mints and validates the cookie-borne tokens, with Redis as the source of
 * truth (auth/README.md). The access token is a signed JWT whose signature is
 * only a cheap pre-check; the authoritative decision is whether a
 * {@link UserSession} still exists in Redis under the {@code sid} claim. This
 * is what makes logout/ban revoke instantly.
 */
@Service
public class RedisTokenSessionService {

    private static final Logger log = LoggerFactory.getLogger(RedisTokenSessionService.class);
    private static final String CLAIM_SID = "sid";
    private static final String CLAIM_STATE = "state";
    private static final String REFRESH_PREFIX = "ambi:refresh:";
    /**
     * How long a consumed (burned) refresh-token record stays in Redis for
     * reuse-detection purposes (Inv 6). Long enough that a replay attempt
     * after a successful rotation reliably trips the detector; short enough
     * that benign collisions with a stale browser tab don't poison things
     * forever.
     */
    private static final Duration BURN_GRACE = Duration.ofMinutes(2);

    private final StringRedisTemplate redis;
    private final AuthProperties props;
    private final SecretKey signingKey;
    /**
     * Owns its own Jackson 3 ({@code tools.jackson}) mapper rather than injecting
     * Spring's web bean, keeping its config independent of the HTTP layer.
     * {@link UserSession} uses only primitives, strings and enums, so the default
     * build needs no extra modules.
     */
    private final JsonMapper objectMapper = JsonMapper.builder().build();

    public RedisTokenSessionService(StringRedisTemplate redis, AuthProperties props) {
        this.redis = redis;
        this.props = props;
        this.signingKey = Keys.hmacShaKeyFor(props.getToken().getSigningKey().getBytes(StandardCharsets.UTF_8));
    }

    /** The freshly minted tokens for a session, ready to be written as cookies. */
    public record Tokens(String accessToken, String refreshToken, String sessionId, boolean persistent) {
    }

    /**
     * The outcome of a successful {@link #refresh(String)} call: the new
     * tokens to set on the response and the (sliding) {@link UserSession} for
     * the caller's {@code /me} payload.
     */
    public record RefreshResult(Tokens tokens, UserSession session) {
    }

    /**
     * Creates a brand-new session for the given principal: writes the
     * {@link UserSession} to Redis with the appropriate TTL and returns a
     * signed access JWT + refresh token. The {@code seed}'s {@code sessionId} is
     * ignored — a fresh one is always generated.
     */
    public Tokens mint(AmbiPrincipal seed, boolean persistent) {
        String sessionId = UUID.randomUUID().toString();
        String familyId = UUID.randomUUID().toString();
        Duration ttl = persistent
                ? props.getToken().getRefreshPersistentTtl()
                : props.getToken().getRefreshIdleTtl();

        UserSession record = new UserSession(
                sessionId,
                seed.state(),
                seed.userId(),
                seed.provider(),
                seed.externalProviderId(),
                seed.email(),
                seed.userLevel(),
                persistent,
                familyId,
                Instant.now().toEpochMilli());

        store(record, ttl);
        String access = buildAccessJwt(record);
        String refresh = UUID.randomUUID().toString();
        writeRefreshToken(refresh, new RefreshTokenRecord(sessionId, familyId, persistent, false), ttl);
        return new Tokens(access, refresh, sessionId, persistent);
    }

    /**
     * Verifies the access JWT's signature/expiry (cheap pre-check) and then —
     * authoritatively — looks the session up in Redis. Returns empty if the
     * token is unparsable/expired OR the Redis record is absent (revoked,
     * expired, never existed), so a valid signature alone is never sufficient.
     */
    public Optional<UserSession> validate(String accessJwt) {
        if (accessJwt == null || accessJwt.isBlank()) {
            return Optional.empty();
        }
        String sessionId;
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(accessJwt)
                    .getPayload();
            sessionId = claims.get(CLAIM_SID, String.class);
        } catch (JwtException | IllegalArgumentException e) {
            // Bad signature, expired, malformed — treat as unauthenticated.
            return Optional.empty();
        }
        if (sessionId == null || sessionId.isBlank()) {
            return Optional.empty();
        }
        return read(sessionId);
    }

    /**
     * Privilege-boundary rotation (Inv 4): mint a fresh session for the new
     * principal and invalidate the old one. Used on visitor→guest today and on
     * guest/visitor→registered and preRegistration→registered in Phase 2.
     */
    public Tokens rotate(String oldSessionId, AmbiPrincipal seed, boolean persistent) {
        Tokens minted = mint(seed, persistent);
        revoke(oldSessionId);
        return minted;
    }

    /** Deletes the session record so the next request with this token is rejected (logout). */
    public void revoke(String sessionId) {
        if (sessionId != null && !sessionId.isBlank()) {
            redis.delete(key(sessionId));
        }
    }

    /**
     * Sliding rotation (auth/README.md Inv 6): consumes the caller's refresh
     * token and, on success, returns fresh access + refresh tokens for the
     * <em>same</em> session and slides the {@link UserSession} TTL. Empty
     * result means the caller should be logged out; the caller is responsible
     * for turning that into a 401.
     *
     * <p>Reuse detection: the previous refresh token's record is kept marked
     * {@code burned=true} for {@link #BURN_GRACE}. A second refresh attempt
     * with the same token within that window is taken as evidence of a leak
     * — the backing {@link UserSession} is revoked, killing the entire
     * refresh-token family. Network retries that succeed on the server but
     * fail to deliver the response leave the user logged out; that is
     * accepted as the cost of strict reuse detection (the OWASP-recommended
     * trade-off).
     */
    public Optional<RefreshResult> refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return Optional.empty();
        }
        String refreshKey = refreshKey(refreshToken);
        String refreshJson = redis.opsForValue().get(refreshKey);
        if (refreshJson == null) {
            // Never minted, expired, or already wiped by a previous burn-detect.
            return Optional.empty();
        }
        RefreshTokenRecord record = parseRefreshToken(refreshJson).orElse(null);
        if (record == null) {
            return Optional.empty();
        }
        if (record.isBurned()) {
            log.warn("Refresh-token reuse detected — revoking session {} (family {})",
                    record.getSessionId(), record.getFamilyId());
            revoke(record.getSessionId());
            return Optional.empty();
        }

        // The session must still exist in Redis (Redis is authoritative).
        Optional<UserSession> session = read(record.getSessionId());
        if (session.isEmpty()) {
            // Orphan refresh token whose session was already revoked or
            // expired — clean it up so it can't be reused later.
            redis.delete(refreshKey);
            return Optional.empty();
        }

        Duration ttl = record.isPersistent()
                ? props.getToken().getRefreshPersistentTtl()
                : props.getToken().getRefreshIdleTtl();

        // Mint the new refresh first, then burn the old one. Doing it in this
        // order means a crash between the two writes leaves the old token
        // valid (and the new one also valid) — favouring availability over a
        // tiny temporary window in which both tokens would refresh. The
        // alternative (burn-then-mint on crash) would log the user out.
        String newRefresh = UUID.randomUUID().toString();
        writeRefreshToken(newRefresh,
                new RefreshTokenRecord(record.getSessionId(), record.getFamilyId(), record.isPersistent(), false),
                ttl);
        record.setBurned(true);
        writeRefreshToken(refreshToken, record, BURN_GRACE);

        // Slide the user-session TTL to the same idle/persistent window.
        redis.expire(key(record.getSessionId()), ttl);

        String accessJwt = buildAccessJwt(session.get());
        Tokens tokens = new Tokens(accessJwt, newRefresh, record.getSessionId(), record.isPersistent());
        return Optional.of(new RefreshResult(tokens, session.get()));
    }

    // ── internals ────────────────────────────────────────────────────────────

    private Optional<UserSession> read(String sessionId) {
        String json = redis.opsForValue().get(key(sessionId));
        if (json == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readValue(json, UserSession.class));
        } catch (Exception e) {
            // A corrupt record is as good as no session; log and reject.
            log.warn("Discarding unreadable session record sid={}", sessionId, e);
            return Optional.empty();
        }
    }

    private void store(UserSession record, Duration ttl) {
        try {
            redis.opsForValue().set(key(record.getSessionId()), objectMapper.writeValueAsString(record), ttl);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to persist session record", e);
        }
    }

    private Optional<RefreshTokenRecord> parseRefreshToken(String json) {
        try {
            return Optional.of(objectMapper.readValue(json, RefreshTokenRecord.class));
        } catch (Exception e) {
            log.warn("Discarding unreadable refresh-token record", e);
            return Optional.empty();
        }
    }

    private void writeRefreshToken(String token, RefreshTokenRecord record, Duration ttl) {
        try {
            redis.opsForValue().set(refreshKey(token), objectMapper.writeValueAsString(record), ttl);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to persist refresh-token record", e);
        }
    }

    private static String refreshKey(String token) {
        return REFRESH_PREFIX + token;
    }

    private String buildAccessJwt(UserSession record) {
        Instant now = Instant.now();
        Instant exp = now.plus(props.getToken().getAccessTtl());
        return Jwts.builder()
                .issuer(props.getToken().getIssuer())
                .subject(record.getUserId() != null ? record.getUserId() : record.getSessionId())
                .claim(CLAIM_SID, record.getSessionId())
                .claim(CLAIM_STATE, record.getState().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(signingKey)
                .compact();
    }

    private String key(String sessionId) {
        return props.getSession().getRedisNamespace() + ":" + sessionId;
    }
}
