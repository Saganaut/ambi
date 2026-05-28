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
import com.fasterxml.jackson.databind.ObjectMapper;

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

    private final StringRedisTemplate redis;
    private final AuthProperties props;
    private final SecretKey signingKey;
    /**
     * Owns its own Jackson 2 mapper rather than injecting Spring's. Spring Boot 4
     * ships both Jackson 2 ({@code com.fasterxml.jackson}) and Jackson 3
     * ({@code tools.jackson}) on the classpath, and the auto-configured
     * {@code ObjectMapper} bean is the Jackson 3 one — injecting a Jackson 2
     * {@code ObjectMapper} would not resolve at runtime. {@link UserSession}
     * uses only primitives, strings and enums, so no extra modules are needed.
     */
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RedisTokenSessionService(StringRedisTemplate redis, AuthProperties props) {
        this.redis = redis;
        this.props = props;
        this.signingKey = Keys.hmacShaKeyFor(props.getToken().getSigningKey().getBytes(StandardCharsets.UTF_8));
    }

    /** The freshly minted tokens for a session, ready to be written as cookies. */
    public record Tokens(String accessToken, String refreshToken, String sessionId, boolean persistent) {
    }

    /**
     * Creates a brand-new session for the given principal: writes the
     * {@link UserSession} to Redis with the appropriate TTL and returns a
     * signed access JWT + refresh token. The {@code seed}'s {@code sessionId} is
     * ignored — a fresh one is always generated.
     */
    public Tokens mint(AmbiPrincipal seed, boolean persistent) {
        String sessionId = UUID.randomUUID().toString();
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
                UUID.randomUUID().toString(), // refresh family id (Phase-2 lineage)
                Instant.now().toEpochMilli());

        store(record, ttl);
        String access = buildAccessJwt(record);
        String refresh = UUID.randomUUID().toString(); // opaque; validated on /refresh in Phase 2
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
