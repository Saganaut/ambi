package com.cephadex.ambi.media.variants;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.security.MessageDigest;

import org.springframework.stereotype.Component;

import com.cephadex.ambi.common.exception.UnauthorizedException;
import com.cephadex.ambi.media.storage.MediaProperties;

/**
 * The whole of the authorization on the internal worker callback: a shared
 * secret presented in a header.
 *
 * <p>The callback carries no user identity — the worker is a background process,
 * not a caller — so Spring Security permits the route and this is what stands
 * in its place. The comparison is constant-time, since a byte-by-byte one would
 * leak how much of a guessed secret was right.
 *
 * <p>Refuses to start on an unset or trivially short secret, exactly as
 * {@code OpaqueImageUrls} does: the only signal a missing secret would otherwise
 * give is that anyone able to reach the endpoint can mark tiers ready.
 */
@Component
public class WorkerCallbackAuthenticator {

    /** Minimum secret length, mirroring the other shared secrets in this codebase. */
    private static final int MIN_SECRET_LENGTH = 32;

    private final byte[] secret;

    public WorkerCallbackAuthenticator(MediaProperties props) {
        String configured = props.getVariants().getCallbackSecret();
        if (configured == null || configured.strip().length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException("ambi.media.variants.callback-secret must be a random secret of at least "
                    + MIN_SECRET_LENGTH + " characters");
        }
        this.secret = configured.getBytes(UTF_8);
    }

    /**
     * Let the request through, or reject it as {@code 401 WORKER_AUTH_FAILED}.
     * A missing header and a wrong secret are the same answer — nothing about
     * which one it was reaches the caller.
     */
    public void require(String presentedSecret) {
        if (presentedSecret == null || !MessageDigest.isEqual(secret, presentedSecret.getBytes(UTF_8))) {
            throw new UnauthorizedException("WORKER_AUTH_FAILED", "Not authorized.");
        }
    }
}
