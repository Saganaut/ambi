package com.cephadex.ambi.media.storage;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Objects;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.common.exception.ValidationException;

/**
 * Mints and verifies the <em>opaque</em> image URLs served by
 * {@code OpaqueImageController} — a signed capability over one S3 key that says
 * nothing about which key it stands for.
 *
 * <p>The sibling {@link ImageUrlResolver} presigns S3 GET URLs path-style, so
 * the URL carries the object's key: {@code …/drawing/{sessionId}/{participantId}/…}
 * for a live-session drawing answer, {@code …/gallery/{uuid}/…} for an authored
 * one. That is harmless where the reader is entitled to know what they are
 * looking at, but it is a <strong>tell</strong> on a board that deliberately
 * mixes the two — a {@code SPOT_THE_ANSWER} follow-up seeds the authored answer
 * among participant submissions, and anyone reading devtools would spot the one
 * candidate served from a different key namespace. A token minted here encodes
 * the key inside its signature instead, so every candidate URL on such a board
 * is the same shape: {@code /api/media/opaque-image?t=…}.
 *
 * <p><strong>Shape.</strong> {@code base64url(payload).base64url(hmac(payload))},
 * where {@code payload} is {@code {expiryEpochSeconds}:{key}}. Both halves use
 * the URL-safe, unpadded alphabet, so a token needs no percent-encoding. The
 * signature is HMAC-SHA256 under {@code ambi.media.opaque-token-secret} and is
 * checked in constant time, so the key inside the payload cannot be swapped for
 * another (nor its expiry pushed out) without the secret.
 *
 * <p><strong>Lifetime.</strong> {@code ambi.media.opaque-token-ttl} defaults to
 * six hours, matching the TTL of the Redis snapshots these URLs get frozen into
 * ({@code FollowUpOptionStore}). A presigned URL's one-hour TTL is the shorter
 * of the two, so a snapshot minted with one goes dead while the round it
 * describes is still playable; a token that outlives its own snapshot cannot.
 *
 * <p><strong>Not a replacement for the presigner.</strong> These URLs cost a
 * proxied read through our own origin, so they are for the narrow case where the
 * <em>key namespace itself</em> is confidential. Ordinary image reads keep
 * presigning, which serves bytes straight from the bucket.
 */
@Component
public class OpaqueImageUrls {

    /** The route {@code OpaqueImageController} serves these URLs from. */
    public static final String PATH = "/api/media/opaque-image";

    /** The query parameter the token travels in. */
    public static final String TOKEN_PARAM = "t";

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    /** Minimum secret length, mirroring the >= 256-bit key the access JWT requires. */
    private static final int MIN_SECRET_LENGTH = 32;

    /** Between the token's payload and its signature. */
    private static final char SIGNATURE_SEPARATOR = '.';

    /** Between the payload's expiry and the key it covers. */
    private static final char PAYLOAD_SEPARATOR = ':';

    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final SecretKeySpec secret;
    private final Duration ttl;
    /** Origin the minted URLs are absolute against; empty mints root-relative ones. */
    private final String baseUrl;
    private final Clock clock;

    @Autowired
    public OpaqueImageUrls(MediaProperties props) {
        this(props, Clock.systemUTC());
    }

    /** Package-private seam: lets a test drive token expiry with a virtual {@link Clock}. */
    OpaqueImageUrls(MediaProperties props, Clock clock) {
        String configured = props.getOpaqueTokenSecret();
        // Fail fast rather than serve forgeable tokens: an unset (or trivially
        // short) secret is a deployment error, and the only signal it would
        // otherwise give is that anyone can mint their own image links.
        if (configured == null || configured.strip().length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException("ambi.media.opaque-token-secret must be a random secret of at least "
                    + MIN_SECRET_LENGTH + " characters");
        }
        Duration configuredTtl = props.getOpaqueTokenTtl();
        if (configuredTtl == null || configuredTtl.isZero() || configuredTtl.isNegative()) {
            throw new IllegalStateException("ambi.media.opaque-token-ttl must be a positive duration");
        }
        this.secret = new SecretKeySpec(configured.getBytes(UTF_8), HMAC_ALGORITHM);
        this.ttl = configuredTtl;
        this.baseUrl = trimTrailingSlash(props.getPublicBaseUrl());
        this.clock = clock;
    }

    /**
     * A ready-to-render URL for the object stored under {@code key}, valid for
     * the configured TTL. Absolute against {@code ambi.media.public-base-url}
     * (the browser loading it is on the frontend's origin, which is a different
     * one in dev); root-relative when that property is blank, for a deployment
     * that fronts both halves with one origin.
     */
    public String url(String key) {
        return baseUrl + PATH + "?" + TOKEN_PARAM + "=" + token(key);
    }

    /** The signed token alone, for a caller that builds its own URL (e.g. a test). */
    public String token(String key) {
        Objects.requireNonNull(key, "key required");
        byte[] payload = (clock.instant().plus(ttl).getEpochSecond() + String.valueOf(PAYLOAD_SEPARATOR) + key)
                .getBytes(UTF_8);
        return ENCODER.encodeToString(payload) + SIGNATURE_SEPARATOR + ENCODER.encodeToString(sign(payload));
    }

    /**
     * The S3 key a token stands for. Anything a client could have tampered with
     * — a malformed token, a bad signature, an elapsed expiry — is a
     * {@link ValidationException} (400 {@code VALIDATION_FAILED}), the same way
     * {@code RemoteImageService} reports every failure of its own user-supplied
     * input. The message never echoes the token or names the key.
     */
    public String keyFrom(String token) {
        if (token == null || token.isBlank()) {
            throw invalid();
        }
        int separator = token.indexOf(SIGNATURE_SEPARATOR);
        if (separator <= 0 || separator == token.length() - 1) {
            throw invalid();
        }
        byte[] payload;
        byte[] signature;
        try {
            payload = DECODER.decode(token.substring(0, separator));
            signature = DECODER.decode(token.substring(separator + 1));
        } catch (IllegalArgumentException _) {
            throw invalid();
        }
        // Constant-time: a byte-by-byte comparison would leak how much of a
        // guessed signature was right.
        if (!MessageDigest.isEqual(sign(payload), signature)) {
            throw invalid();
        }
        String decoded = new String(payload, UTF_8);
        int keyAt = decoded.indexOf(PAYLOAD_SEPARATOR);
        if (keyAt <= 0 || keyAt == decoded.length() - 1) {
            throw invalid();
        }
        long expiresAt;
        try {
            expiresAt = Long.parseLong(decoded.substring(0, keyAt));
        } catch (NumberFormatException _) {
            throw invalid();
        }
        if (clock.instant().isAfter(Instant.ofEpochSecond(expiresAt))) {
            throw new ValidationException("That image link has expired.");
        }
        return decoded.substring(keyAt + 1);
    }

    /** HMAC-SHA256 of {@code payload} under the configured secret. */
    private byte[] sign(byte[] payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(secret);
            return mac.doFinal(payload);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            // Neither is reachable: HmacSHA256 is a required JCE algorithm and
            // the key is validated at construction.
            throw new IllegalStateException("Cannot sign an opaque image token", e);
        }
    }

    private static ValidationException invalid() {
        return new ValidationException("That image link is not valid.");
    }

    /** The configured origin without its trailing slash, or empty when unset. */
    private static String trimTrailingSlash(String base) {
        if (base == null || base.isBlank()) {
            return "";
        }
        String trimmed = base.strip();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }
}
