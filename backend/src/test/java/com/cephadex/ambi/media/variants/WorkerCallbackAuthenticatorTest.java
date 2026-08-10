package com.cephadex.ambi.media.variants;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.common.exception.UnauthorizedException;
import com.cephadex.ambi.media.storage.MediaProperties;

/**
 * The shared secret behind the worker callback: it is the entire authorization
 * on that route, so an unset or trivially short one must fail at startup rather
 * than quietly let anyone mark tiers ready, and a wrong or missing presentation
 * must be the same {@code 401 WORKER_AUTH_FAILED} either way.
 */
class WorkerCallbackAuthenticatorTest {

    private static final String SECRET = "test-only-worker-callback-secret-at-least-32-chars";

    @Test
    void theConfiguredSecretIsAccepted() {
        assertThatCode(() -> authenticator(SECRET).require(SECRET)).doesNotThrowAnyException();
    }

    @Test
    void aWrongOrMissingSecretIsTheSameRejection() {
        WorkerCallbackAuthenticator authenticator = authenticator(SECRET);

        assertThatThrownBy(() -> authenticator.require("not-the-secret-but-long-enough-to-look-it"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Not authorized.");
        assertThatThrownBy(() -> authenticator.require(null))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Not authorized.");
        // A prefix of the real secret must not read as "nearly right" either.
        assertThatThrownBy(() -> authenticator.require(SECRET.substring(0, SECRET.length() - 1)))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void refusesToStartWithoutAUsableSecret() {
        assertThatIllegalStateException().isThrownBy(() -> authenticator(null))
                .withMessageContaining("ambi.media.variants.callback-secret");
        assertThatIllegalStateException().isThrownBy(() -> authenticator("too-short"))
                .withMessageContaining("32");
    }

    private static WorkerCallbackAuthenticator authenticator(String secret) {
        MediaProperties props = new MediaProperties();
        props.getVariants().setCallbackSecret(secret);
        return new WorkerCallbackAuthenticator(props);
    }
}
