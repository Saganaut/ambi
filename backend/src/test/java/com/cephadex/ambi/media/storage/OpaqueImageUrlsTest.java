package com.cephadex.ambi.media.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;
import static java.nio.charset.StandardCharsets.UTF_8;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Base64;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.common.exception.ValidationException;

/**
 * The opaque image URL contract: a token round-trips its S3 key, says nothing
 * about it, and stops being accepted once it expires or is touched. Every
 * rejection is the same 400 {@code VALIDATION_FAILED} the remote-image proxy
 * reports its own bad input with — the caller supplied the token, so nothing
 * here is a server fault.
 */
class OpaqueImageUrlsTest {

    private static final String SECRET = "test-only-opaque-image-secret-of-sufficient-length";
    private static final String KEY = "drawing/session-1/participant-1/lg.webp";

    @Test
    void tokenRoundTripsTheKey() {
        OpaqueImageUrls urls = urlsWith(new FakeClock());

        assertThat(urls.keyFrom(urls.token(KEY))).isEqualTo(KEY);
    }

    @Test
    void urlIsAbsoluteAndCarriesNothingButTheToken() {
        OpaqueImageUrls urls = urlsWith(new FakeClock());

        String url = urls.url(KEY);

        assertThat(url).startsWith("https://api.example.com/api/media/opaque-image?t=");
        // The whole point: the key's namespace must not be readable off the URL,
        // or a SPOT_THE_ANSWER board's seeded (gallery/…) card stands out from
        // the submitted (drawing/…) ones in devtools.
        assertThat(url).doesNotContain("drawing").doesNotContain("gallery").doesNotContain(KEY);
        // Base64url + '.' only, so the token needs no percent-encoding.
        assertThat(url.substring(url.indexOf("?t=") + 3)).matches("[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+");
    }

    @Test
    void aBlankBaseUrlMintsARootRelativeUrl() {
        MediaProperties props = props();
        props.setPublicBaseUrl("");

        assertThat(new OpaqueImageUrls(props, new FakeClock()).url(KEY))
                .startsWith("/api/media/opaque-image?t=");
    }

    @Test
    void aTrailingSlashOnTheBaseUrlIsNotDoubled() {
        MediaProperties props = props();
        props.setPublicBaseUrl("https://api.example.com/");

        assertThat(new OpaqueImageUrls(props, new FakeClock()).url(KEY))
                .startsWith("https://api.example.com/api/media/opaque-image?t=");
    }

    @Test
    void anExpiredTokenIsRejected() {
        FakeClock clock = new FakeClock();
        OpaqueImageUrls urls = urlsWith(clock);
        String token = urls.token(KEY);

        // Still good at the last second of its 6h life...
        clock.advance(Duration.ofHours(6));
        assertThat(urls.keyFrom(token)).isEqualTo(KEY);

        // ...and dead a second later. A snapshot outliving its links is the
        // failure mode this TTL is sized (6h, like the round snapshot) to avoid.
        clock.advance(Duration.ofSeconds(1));
        assertThatExceptionOfType(ValidationException.class)
                .isThrownBy(() -> urls.keyFrom(token))
                .withMessageContaining("expired");
    }

    @Test
    void aTamperedPayloadIsRejected() {
        FakeClock clock = new FakeClock();
        OpaqueImageUrls urls = urlsWith(clock);
        String token = urls.token(KEY);
        int separator = token.indexOf('.');

        // Re-point the token at someone else's object, keeping the signature: the
        // key lives inside the signed payload, so this cannot be swapped without
        // the secret.
        String forged = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("9999999999:gallery/other/lg.webp".getBytes(UTF_8))
                + token.substring(separator);

        assertThatExceptionOfType(ValidationException.class)
                .isThrownBy(() -> urls.keyFrom(forged))
                .withMessageContaining("not valid");
    }

    @Test
    void aTokenSignedWithAnotherSecretIsRejected() {
        MediaProperties other = props();
        other.setOpaqueTokenSecret("a-completely-different-secret-of-sufficient-length");
        String foreign = new OpaqueImageUrls(other, new FakeClock()).token(KEY);

        assertThatExceptionOfType(ValidationException.class)
                .isThrownBy(() -> urlsWith(new FakeClock()).keyFrom(foreign))
                .withMessageContaining("not valid");
    }

    @Test
    void malformedTokensAreRejectedRatherThanCrashing() {
        OpaqueImageUrls urls = urlsWith(new FakeClock());

        for (String bad : new String[] {
                "", "   ", "no-separator", ".", "abc.", ".abc", "not base64!.not base64!",
        }) {
            assertThatExceptionOfType(ValidationException.class)
                    .as("token %s", bad)
                    .isThrownBy(() -> urls.keyFrom(bad));
        }
        assertThatExceptionOfType(ValidationException.class).isThrownBy(() -> urls.keyFrom(null));
    }

    @Test
    void refusesToStartWithoutAUsableSecret() {
        // An unset or trivially short secret is a deployment error whose only
        // other symptom would be that anyone can mint their own image links.
        for (String secret : new String[] { null, "", "   ", "too-short" }) {
            MediaProperties props = props();
            props.setOpaqueTokenSecret(secret);
            assertThatIllegalStateException()
                    .isThrownBy(() -> new OpaqueImageUrls(props))
                    .withMessageContaining("opaque-token-secret");
        }
    }

    @Test
    void refusesToStartWithANonPositiveTtl() {
        MediaProperties props = props();
        props.setOpaqueTokenTtl(Duration.ZERO);

        assertThatIllegalStateException()
                .isThrownBy(() -> new OpaqueImageUrls(props))
                .withMessageContaining("opaque-token-ttl");
    }

    private static MediaProperties props() {
        MediaProperties props = new MediaProperties();
        props.setOpaqueTokenSecret(SECRET);
        props.setPublicBaseUrl("https://api.example.com");
        return props;
    }

    private static OpaqueImageUrls urlsWith(Clock clock) {
        return new OpaqueImageUrls(props(), clock);
    }

    /** Virtual wall clock, so the expiry test doesn't sleep six hours. */
    private static final class FakeClock extends Clock {
        private Instant now = Instant.parse("2026-01-01T00:00:00Z");

        @Override
        public Instant instant() {
            return now;
        }

        void advance(Duration delta) {
            now = now.plus(delta);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }
    }
}
