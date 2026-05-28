package com.cephadex.ambi.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import com.cephadex.ambi.auth.config.AuthProperties;
import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Verifies the Redis-authoritative contract: a valid JWT signature is never
 * sufficient on its own — the session must still exist in Redis. Also covers
 * privilege-boundary rotation (Inv 4) and revocation.
 */
class RedisTokenSessionServiceTest {

    private StringRedisTemplate redis;
    private ValueOperations<String, String> valueOps;
    private RedisTokenSessionService service;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        redis = mock(StringRedisTemplate.class);
        valueOps = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(valueOps);

        AuthProperties props = new AuthProperties();
        props.getToken().setSigningKey("test-only-signing-key-at-least-32-bytes-long-xyz");

        service = new RedisTokenSessionService(redis, props);
    }

    @Test
    void mintWritesSessionRecordWithTtl() {
        RedisTokenSessionService.Tokens tokens = service.mint(guestSeed(), false);

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Duration> ttlCaptor = ArgumentCaptor.forClass(Duration.class);
        verify(valueOps).set(keyCaptor.capture(), anyString(), ttlCaptor.capture());

        assertThat(tokens.accessToken()).isNotBlank();
        assertThat(tokens.sessionId()).isNotBlank();
        assertThat(keyCaptor.getValue()).isEqualTo("ambi:session:" + tokens.sessionId());
        assertThat(ttlCaptor.getValue()).isEqualTo(Duration.ofMinutes(30)); // idle window
    }

    @Test
    void validateReturnsEmptyWhenRedisHasNoRecord_evenWithValidSignature() {
        RedisTokenSessionService.Tokens tokens = service.mint(guestSeed(), false);
        // The signature is valid (same key), but Redis returns nothing → reject.
        when(valueOps.get(anyString())).thenReturn(null);

        assertThat(service.validate(tokens.accessToken())).isEmpty();
    }

    @Test
    void validateReturnsRecordWhenRedisHasIt() {
        ArgumentCaptor<String> jsonCaptor = ArgumentCaptor.forClass(String.class);
        RedisTokenSessionService.Tokens tokens = service.mint(guestSeed(), false);
        verify(valueOps).set(anyString(), jsonCaptor.capture(), any(Duration.class));
        when(valueOps.get("ambi:session:" + tokens.sessionId())).thenReturn(jsonCaptor.getValue());

        Optional<SessionRecord> record = service.validate(tokens.accessToken());

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
        RedisTokenSessionService.Tokens rotated = service.rotate("old-session-id", guestSeed(), false);

        assertThat(rotated.sessionId()).isNotEqualTo("old-session-id");
        verify(valueOps).set(eq("ambi:session:" + rotated.sessionId()), anyString(), any(Duration.class));
        verify(redis).delete("ambi:session:old-session-id");
    }

    @Test
    void revokeDeletesTheKey() {
        service.revoke("sid-123");
        verify(redis).delete("ambi:session:sid-123");
    }

    private static AmbiPrincipal guestSeed() {
        return new AmbiPrincipal(IdentityState.GUEST, "user-1", "pub-1", UserLevel.GUEST,
                AuthProvider.INTERNAL, null, null, null);
    }
}
