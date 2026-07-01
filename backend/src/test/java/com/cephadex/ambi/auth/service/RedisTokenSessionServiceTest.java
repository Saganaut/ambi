package com.cephadex.ambi.auth.service;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import com.cephadex.ambi.auth.config.AuthProperties;
import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.user.enums.UserLevel;
import tools.jackson.databind.json.JsonMapper;

/**
 * Verifies the Redis-authoritative contract: a valid JWT signature is never
 * sufficient on its own — the session must still exist in Redis. Also covers
 * privilege-boundary rotation (Inv 4), instant logout revocation, and the
 * Phase-2 refresh + reuse-detection lifecycle (Inv 6).
 *
 * <p>Backs the mocked {@link StringRedisTemplate} with a tiny in-memory KV so
 * the service's full read-back behaviour (mint → validate, mint → refresh, …)
 * is exercised rather than test-cased into pieces.
 */
class RedisTokenSessionServiceTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private StringRedisTemplate redis;
    private ValueOperations<String, String> valueOps;
    private RedisTokenSessionService service;
    private Map<String, String> store;
    private Map<String, Duration> ttls;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        redis = mock(StringRedisTemplate.class);
        valueOps = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(valueOps);

        store = new HashMap<>();
        ttls = new HashMap<>();

        when(valueOps.get(anyString())).thenAnswer(inv -> store.get((String) inv.getArgument(0)));
        // The three-arg set(K, V, Duration) overload is what the service uses.
        doAnswerSet();
        when(redis.delete(anyString())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            boolean removed = store.remove(key) != null;
            ttls.remove(key);
            return removed;
        });
        when(redis.expire(anyString(), any(Duration.class))).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            if (!store.containsKey(key)) {
                return false;
            }
            ttls.put(key, inv.getArgument(1));
            return true;
        });

        AuthProperties props = new AuthProperties();
        props.getToken().setSigningKey("test-only-signing-key-at-least-32-bytes-long-xyz");

        service = new RedisTokenSessionService(redis, props);
    }

    private void doAnswerSet() {
        org.mockito.Mockito.doAnswer(inv -> {
            store.put(inv.getArgument(0), inv.getArgument(1));
            ttls.put(inv.getArgument(0), inv.getArgument(2));
            return null;
        }).when(valueOps).set(anyString(), anyString(), any(Duration.class));
    }

    // ── mint / validate / rotate / revoke ────────────────────────────────────

    @Test
    void mintWritesUserSessionAndRefreshTokenWithMatchingTtl() {
        RedisTokenSessionService.Tokens tokens = service.mint(guestSeed(), false);

        String sessionKey = "ambi:userSession:" + tokens.sessionId();
        String refreshKey = "ambi:refresh:" + tokens.refreshToken();
        assertThat(store).containsKeys(sessionKey, refreshKey);
        // idle window for non-persistent sessions; both keys share it.
        assertThat(ttls.get(sessionKey)).isEqualTo(Duration.ofMinutes(30));
        assertThat(ttls.get(refreshKey)).isEqualTo(Duration.ofMinutes(30));
        assertThat(tokens.accessToken()).isNotBlank();
    }

    @Test
    void validateReturnsEmptyWhenRedisHasNoRecord_evenWithValidSignature() {
        RedisTokenSessionService.Tokens tokens = service.mint(guestSeed(), false);
        // Wipe the session — signature still verifies, but Redis is authoritative.
        store.remove("ambi:userSession:" + tokens.sessionId());

        assertThat(service.validate(tokens.accessToken())).isEmpty();
    }

    @Test
    void validateReturnsRecordWhenRedisHasIt() {
        RedisTokenSessionService.Tokens tokens = service.mint(guestSeed(), false);

        Optional<UserSession> record = service.validate(tokens.accessToken());

        assertThat(record).isPresent();
        assertThat(record.get().getSessionId()).isEqualTo(tokens.sessionId());
        assertThat(record.get().getState()).isEqualTo(IdentityState.GUEST);
    }

    @Test
    void validateRejectsGarbageToken() {
        assertThat(service.validate("not-a-jwt")).isEmpty();
        assertThat(service.validate(null)).isEmpty();
        assertThat(service.validate("  ")).isEmpty();
    }

    @Test
    void rotateMintsNewAndDeletesOld() {
        // Seed a "previous" session in the store the way mint() would have.
        RedisTokenSessionService.Tokens previous = service.mint(guestSeed(), false);

        RedisTokenSessionService.Tokens rotated = service.rotate(previous.sessionId(), guestSeed(), false);

        assertThat(rotated.sessionId()).isNotEqualTo(previous.sessionId());
        assertThat(store).containsKey("ambi:userSession:" + rotated.sessionId());
        assertThat(store).doesNotContainKey("ambi:userSession:" + previous.sessionId());
        verify(redis).delete("ambi:userSession:" + previous.sessionId());
    }

    @Test
    void revokeDeletesTheKey() {
        service.revoke("sid-123");
        verify(redis).delete("ambi:userSession:sid-123");
    }

    // ── refresh / reuse detection (Inv 6) ────────────────────────────────────

    @Test
    void refreshRotatesTokensAndSlidesSessionTtl() {
        RedisTokenSessionService.Tokens minted = service.mint(guestSeed(), false);
        String sessionKey = "ambi:userSession:" + minted.sessionId();
        String oldRefreshKey = "ambi:refresh:" + minted.refreshToken();

        Optional<RedisTokenSessionService.RefreshResult> result = service.refresh(minted.refreshToken());

        assertThat(result).isPresent();
        RedisTokenSessionService.Tokens rotated = result.get().tokens();
        assertThat(rotated.sessionId()).isEqualTo(minted.sessionId()); // same session, new tokens
        assertThat(rotated.refreshToken()).isNotEqualTo(minted.refreshToken());
        // Don't assert the access JWT changed: jwt iat/exp have second resolution,
        // and within the same second the payload (and thus the signature) is
        // identical. The refresh contract is "new refresh token + sliding TTL",
        // not "different access-token bytes" — the access JWT is just re-minted.
        assertThat(rotated.accessToken()).isNotBlank();

        // New refresh entry written, old one burned (kept but flagged).
        String newRefreshKey = "ambi:refresh:" + rotated.refreshToken();
        assertThat(store).containsKeys(sessionKey, newRefreshKey, oldRefreshKey);
        assertThat(readRefresh(oldRefreshKey).isBurned()).isTrue();
        assertThat(readRefresh(newRefreshKey).isBurned()).isFalse();
        // Session TTL slid to the same idle window.
        assertThat(ttls.get(sessionKey)).isEqualTo(Duration.ofMinutes(30));
        // Burned record's TTL collapses to the short grace window.
        assertThat(ttls.get(oldRefreshKey)).isEqualTo(Duration.ofMinutes(2));
    }

    @Test
    void refreshReplayOfBurnedTokenRevokesSession() {
        RedisTokenSessionService.Tokens minted = service.mint(guestSeed(), false);
        // First refresh succeeds, burning the original token.
        service.refresh(minted.refreshToken());

        // The attacker (or a replayed network packet) sends the burned token again.
        Optional<RedisTokenSessionService.RefreshResult> reuse = service.refresh(minted.refreshToken());

        assertThat(reuse).isEmpty();
        // The whole family dies — the underlying session is gone.
        assertThat(store).doesNotContainKey("ambi:userSession:" + minted.sessionId());
    }

    @Test
    void refreshOrphanRefreshWithMissingSessionDeletesItself() {
        RedisTokenSessionService.Tokens minted = service.mint(guestSeed(), false);
        // Simulate the session being revoked elsewhere (logout from another tab).
        store.remove("ambi:userSession:" + minted.sessionId());

        Optional<RedisTokenSessionService.RefreshResult> result = service.refresh(minted.refreshToken());

        assertThat(result).isEmpty();
        // Orphan cleaned up so a later replay can't re-trigger any logic.
        assertThat(store).doesNotContainKey("ambi:refresh:" + minted.refreshToken());
    }

    @Test
    void refreshRejectsUnknownTokenWithoutSideEffects() {
        assertThat(service.refresh("never-seen")).isEmpty();
        assertThat(service.refresh(null)).isEmpty();
        assertThat(service.refresh("  ")).isEmpty();
        assertThat(store).isEmpty();
    }

    @Test
    void refreshUsesPersistentTtlForPersistentSession() {
        RedisTokenSessionService.Tokens minted = service.mint(guestSeed(), true);

        Optional<RedisTokenSessionService.RefreshResult> result = service.refresh(minted.refreshToken());

        assertThat(result).isPresent();
        String newRefreshKey = "ambi:refresh:" + result.get().tokens().refreshToken();
        // 30 days — the "stay logged in" window from AuthProperties.
        assertThat(ttls.get(newRefreshKey)).isEqualTo(Duration.ofDays(30));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private RefreshTokenRecord readRefresh(String key) {
        try {
            return JSON.readValue(store.get(key), RefreshTokenRecord.class);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static AmbiPrincipal guestSeed() {
        return new AmbiPrincipal(IdentityState.GUEST, "user-1", "pub-1", UserLevel.GUEST,
                AuthProvider.INTERNAL, null, null, null);
    }
}
