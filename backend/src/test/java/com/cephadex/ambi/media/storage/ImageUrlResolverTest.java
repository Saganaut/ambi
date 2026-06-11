package com.cephadex.ambi.media.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.time.Duration;
import java.util.EnumMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.github.benmanes.caffeine.cache.Ticker;

import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

/**
 * Hydration rules for {@link ImageUrlResolver}: internal variant keys become
 * presigned URLs, external images pass through, and the stored entity is never
 * mutated. The presigner is stubbed to echo the key into the URL so we can assert
 * which key each variant signed.
 */
class ImageUrlResolverTest {

    private ImageUrlResolver resolver;

    private static final String BUCKET = "ambi-images";

    @BeforeEach
    void setUp() {
        // Path-style URL ({endpoint}/{bucket}/{key}) so keyFromUrl round-trips.
        S3Presigner presigner = mock(S3Presigner.class);
        when(presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenAnswer(inv -> {
            GetObjectPresignRequest req = inv.getArgument(0);
            String key = req.getObjectRequest().key();
            PresignedGetObjectRequest presigned = mock(PresignedGetObjectRequest.class);
            when(presigned.url())
                    .thenReturn(URI.create("https://signed/" + BUCKET + "/" + key + "?sig=abc").toURL());
            return presigned;
        });
        S3Properties s3 = new S3Properties();
        s3.setBucket(BUCKET);
        MediaProperties media = new MediaProperties();
        media.setPresignTtl(Duration.ofMinutes(30));
        resolver = new ImageUrlResolver(presigner, s3, media);
    }

    @Test
    void urlPresignsTheKey() {
        assertThat(resolver.url("gallery/x/sm.webp"))
                .isEqualTo("https://signed/ambi-images/gallery/x/sm.webp?sig=abc");
    }

    @Test
    void keyFromUrlIsTheInverseOfUrl() {
        String signed = resolver.url("gallery/x/sm.webp");
        assertThat(resolver.keyFromUrl(signed)).isEqualTo("gallery/x/sm.webp");
        // A raw key (not a URL) passes through untouched.
        assertThat(resolver.keyFromUrl("gallery/x/original")).isEqualTo("gallery/x/original");
    }

    @Test
    void hydrateRewritesInternalSrcKeyAndVariantsToPresignedUrls() {
        Map<ImageSizeOptions, String> variants = new EnumMap<>(ImageSizeOptions.class);
        variants.put(ImageSizeOptions.SM, "gallery/x/sm.webp");
        variants.put(ImageSizeOptions.LG, "gallery/x/lg.webp");
        AppImage stored = new AppImage();
        stored.setExternal(false);
        stored.setSrcKey("gallery/x/original");
        stored.setVariants(variants);

        AppImage hydrated = resolver.hydrate(stored);

        assertThat(hydrated.getVariants().get(ImageSizeOptions.SM))
                .isEqualTo("https://signed/ambi-images/gallery/x/sm.webp?sig=abc");
        assertThat(hydrated.getVariants().get(ImageSizeOptions.LG))
                .isEqualTo("https://signed/ambi-images/gallery/x/lg.webp?sig=abc");
        // srcKey is now signed too — a full URL the client can render directly.
        assertThat(hydrated.getSrcKey())
                .isEqualTo("https://signed/ambi-images/gallery/x/original?sig=abc");
        // The stored entity's variants are untouched — still keys.
        assertThat(stored.getVariants().get(ImageSizeOptions.SM)).isEqualTo("gallery/x/sm.webp");
        assertThat(stored.getSrcKey()).isEqualTo("gallery/x/original");
    }

    @Test
    void hydrateLeavesExternalImagesUntouched() {
        AppImage external = new AppImage();
        external.setExternal(true);
        external.setExternalSrc("https://example.com/cat.png");

        assertThat(resolver.hydrate(external)).isSameAs(external);
    }

    @Test
    void hydrateToleratesNullAndEmpty() {
        assertThat(resolver.hydrate(null)).isNull();

        AppImage noVariants = new AppImage();
        noVariants.setExternal(false);
        assertThat(resolver.hydrate(noVariants)).isSameAs(noVariants);
    }

    @Test
    void urlReusesACachedSignatureWithinTheRefreshWindow() {
        AtomicInteger signings = new AtomicInteger();
        ImageUrlResolver cached = resolverWith(countingPresigner(signings), new FakeTicker());

        String first = cached.url("gallery/x/sm.webp");
        String second = cached.url("gallery/x/sm.webp");

        // Same string back, and the key was signed exactly once — the second
        // read came from cache, so a client never sees the URL change.
        assertThat(second).isEqualTo(first);
        assertThat(signings.get()).isEqualTo(1);
    }

    @Test
    void urlReSignsAfterTheRefreshWindow() {
        AtomicInteger signings = new AtomicInteger();
        FakeTicker ticker = new FakeTicker();
        // ttl 30m, default margin 15m → reuse window is 15m.
        ImageUrlResolver cached = resolverWith(countingPresigner(signings), ticker);

        String first = cached.url("gallery/x/sm.webp");
        ticker.advance(Duration.ofMinutes(16)); // past the 15m reuse window
        String second = cached.url("gallery/x/sm.webp");

        // The cache entry expired, so the key was re-signed into a fresh URL.
        assertThat(second).isNotEqualTo(first);
        assertThat(signings.get()).isEqualTo(2);
    }

    /** A presigner that mints a distinct URL per call and counts how often it signs. */
    private static S3Presigner countingPresigner(AtomicInteger signings) {
        S3Presigner presigner = mock(S3Presigner.class);
        when(presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenAnswer(inv -> {
            GetObjectPresignRequest req = inv.getArgument(0);
            String key = req.getObjectRequest().key();
            int n = signings.incrementAndGet();
            PresignedGetObjectRequest presigned = mock(PresignedGetObjectRequest.class);
            when(presigned.url())
                    .thenReturn(URI.create("https://signed/" + BUCKET + "/" + key + "?sig=" + n).toURL());
            return presigned;
        });
        return presigner;
    }

    private static ImageUrlResolver resolverWith(S3Presigner presigner, Ticker ticker) {
        S3Properties s3 = new S3Properties();
        s3.setBucket(BUCKET);
        MediaProperties media = new MediaProperties();
        media.setPresignTtl(Duration.ofMinutes(30));
        return new ImageUrlResolver(presigner, s3, media, ticker);
    }

    /** Virtual clock for Caffeine, so cache-expiry tests don't sleep. */
    private static final class FakeTicker implements Ticker {
        private long nanos = 0L;

        @Override
        public long read() {
            return nanos;
        }

        void advance(Duration delta) {
            nanos += delta.toNanos();
        }
    }
}
