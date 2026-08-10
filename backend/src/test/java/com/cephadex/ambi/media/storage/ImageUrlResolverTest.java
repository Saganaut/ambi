package com.cephadex.ambi.media.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.Placement;
import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.media.variants.ImageVariantReadiness;
import com.cephadex.ambi.media.variants.PendingImageVariants;
import com.cephadex.ambi.media.variants.PendingImageVariantsRepository;

import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

/**
 * Hydration rules for {@link ImageUrlResolver}: internal variant keys become
 * presigned URLs, external images pass through, and the stored entity is never
 * mutated. Every tier is optional — a partial or empty {@code variants} map
 * hydrates what it has and falls back to the original — and a tier the worker
 * has not rendered yet is dropped on every read path, hydration and the
 * {@code displayKey} tier-walk alike. The presigner is stubbed to echo the key
 * into the URL so we can assert which key each variant signed.
 */
class ImageUrlResolverTest {

    private ImageUrlResolver resolver;
    private PendingImageVariantsRepository pendingVariants;

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
        pendingVariants = mock(PendingImageVariantsRepository.class);
        // No row is the common case: every canonical key is real.
        when(pendingVariants.findById(any())).thenReturn(Optional.empty());
        resolver = new ImageUrlResolver(presigner, s3, media, new ImageVariantReadiness(pendingVariants, media));
    }

    /** Leave {@code unready} tiers outstanding under {@code keyRoot}. */
    private void pending(String keyRoot, ImageSizeOptions... unready) {
        PendingImageVariants row = new PendingImageVariants();
        row.setId(keyRoot);
        row.setRequestedTiers(EnumSet.copyOf(List.of(unready)));
        when(pendingVariants.findById(keyRoot)).thenReturn(Optional.of(row));
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
        Placement placement = new Placement(1, 4, 1, 4);
        AppImage stored = new AppImage();
        stored.setExternal(false);
        stored.setSrcKey("gallery/x/original");
        stored.setVariants(variants);
        stored.setPlacement(placement);

        AppImage hydrated = resolver.hydrate(stored);

        assertThat(hydrated.getVariants().get(ImageSizeOptions.SM))
                .isEqualTo("https://signed/ambi-images/gallery/x/sm.webp?sig=abc");
        assertThat(hydrated.getVariants().get(ImageSizeOptions.LG))
                .isEqualTo("https://signed/ambi-images/gallery/x/lg.webp?sig=abc");
        // srcKey is now signed too — a full URL the client can render directly.
        assertThat(hydrated.getSrcKey())
                .isEqualTo("https://signed/ambi-images/gallery/x/original?sig=abc");
        // Non-URL metadata fields ride through untouched — placement must survive
        // hydration or the client never learns where to position the image.
        assertThat(hydrated.getPlacement()).isEqualTo(placement);
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

        // Nothing stored at all: no key to sign, so the copy carries nothing —
        // but hydration still has to complete rather than blow up.
        AppImage nothingStored = new AppImage();
        nothingStored.setExternal(false);
        AppImage hydrated = resolver.hydrate(nothingStored);
        assertThat(hydrated.getSrcKey()).isNull();
        assertThat(hydrated.getVariants()).isNull();
    }

    @Test
    void hydratePresignsTheOriginalOfAnImageWithNoVariantsYet() {
        // Renditions are derived after the original lands (and AVIF gets none at
        // all), so an image legitimately arrives here with an empty map. Its
        // original must still be signed — it is the only thing a client can show.
        AppImage stored = new AppImage();
        stored.setExternal(false);
        stored.setSrcKey("gallery/x/original");
        stored.setVariants(new EnumMap<>(ImageSizeOptions.class));

        AppImage hydrated = resolver.hydrate(stored);

        assertThat(hydrated.getSrcKey())
                .isEqualTo("https://signed/ambi-images/gallery/x/original?sig=abc");
        assertThat(hydrated.getVariants()).isEmpty();
    }

    @Test
    void hydrateSignsOnlyTheTiersActuallyStored() {
        // A half-derived map: a blank tier is not an object, so signing it would
        // hand the client a URL to something that isn't in the bucket.
        Map<ImageSizeOptions, String> variants = new EnumMap<>(ImageSizeOptions.class);
        variants.put(ImageSizeOptions.SM, "gallery/x/sm.webp");
        variants.put(ImageSizeOptions.LG, " ");
        AppImage stored = new AppImage();
        stored.setExternal(false);
        stored.setSrcKey("gallery/x/original");
        stored.setVariants(variants);

        AppImage hydrated = resolver.hydrate(stored);

        assertThat(hydrated.getVariants()).containsOnlyKeys(ImageSizeOptions.SM);
        assertThat(hydrated.getSrcKey())
                .isEqualTo("https://signed/ambi-images/gallery/x/original?sig=abc");
    }

    // ── Readiness filtering ─────────────────────────────────────────────────────

    @Test
    void hydrateDropsTiersThatAreNotRenderedYet() {
        // The canonical five are always on the image; only the pending row knows
        // which of them are objects, and signing an absent one hands the client
        // a URL that 404s.
        AppImage stored = new AppImage();
        stored.setExternal(false);
        stored.setSrcKey("gallery/x/original");
        stored.setVariants(ImageKeys.variantsFor("gallery/x/original"));
        pending("gallery/x", ImageSizeOptions.MD, ImageSizeOptions.LG, ImageSizeOptions.XL);

        AppImage hydrated = resolver.hydrate(stored);

        assertThat(hydrated.getVariants())
                .containsOnlyKeys(ImageSizeOptions.XS, ImageSizeOptions.SM);
        // The original is always there, so it is always signed.
        assertThat(hydrated.getSrcKey())
                .isEqualTo("https://signed/ambi-images/gallery/x/original?sig=abc");
        // The stored entity keeps its full canonical map.
        assertThat(stored.getVariants()).containsOnlyKeys(ImageSizeOptions.values());
    }

    @Test
    void displayKeyDropsUnreadyTiersAndFallsBackToTheOriginal() {
        // Regression guard for the opaque-proxy / live-session board path, which
        // never runs the serializer and so gets its filtering only here.
        AppImage stored = new AppImage();
        stored.setExternal(false);
        stored.setSrcKey("gallery/x/original");
        stored.setVariants(ImageKeys.variantsFor("gallery/x/original"));
        pending("gallery/x", ImageSizeOptions.MD, ImageSizeOptions.LG, ImageSizeOptions.XL);

        // MD/LG/XL are outstanding, so the walk settles for the largest ready
        // tier below the preferred one rather than naming an absent object.
        assertThat(resolver.displayKey(stored, ImageSizeOptions.MD)).isEqualTo("gallery/x/sm.webp");
    }

    @Test
    void displayKeyFallsBackToTheOriginalWhileNothingIsRenderedYet() {
        // The state every fresh upload is in for a second or two.
        AppImage stored = new AppImage();
        stored.setExternal(false);
        stored.setSrcKey("gallery/fresh/original");
        stored.setVariants(ImageKeys.variantsFor("gallery/fresh/original"));
        pending("gallery/fresh", ImageSizeOptions.values());

        assertThat(resolver.displayKey(stored, ImageSizeOptions.MD)).isEqualTo("gallery/fresh/original");
        assertThat(resolver.hydrate(stored).getVariants()).isEmpty();
    }

    @Test
    void anImageWithNoPendingRowKeepsEveryTier() {
        // A legacy (or completed) image: absence of a row means every canonical
        // key is real, and the filter must not touch it.
        AppImage stored = new AppImage();
        stored.setExternal(false);
        stored.setSrcKey("gallery/legacy/original");
        stored.setVariants(ImageKeys.variantsFor("gallery/legacy/original"));

        assertThat(resolver.hydrate(stored).getVariants())
                .containsOnlyKeys(ImageSizeOptions.values());
        assertThat(resolver.displayKey(stored, ImageSizeOptions.MD)).isEqualTo("gallery/legacy/md.webp");
    }

    @Test
    void displayUrlWalksUpThenDownFromThePreferredTier() {
        Map<ImageSizeOptions, String> variants = new EnumMap<>(ImageSizeOptions.class);
        variants.put(ImageSizeOptions.SM, "gallery/x/sm.webp");
        variants.put(ImageSizeOptions.XL, "gallery/x/xl.webp");
        AppImage internal = new AppImage();
        internal.setExternal(false);
        internal.setVariants(variants);

        // MD missing → the next-larger stored tier (XL) wins over the smaller SM.
        assertThat(resolver.displayUrl(internal, ImageSizeOptions.MD))
                .isEqualTo("https://signed/ambi-images/gallery/x/xl.webp?sig=abc");

        // Nothing at or above the preferred tier → settle for the largest below it.
        variants.remove(ImageSizeOptions.XL);
        assertThat(resolver.displayUrl(internal, ImageSizeOptions.MD))
                .isEqualTo("https://signed/ambi-images/gallery/x/sm.webp?sig=abc");
    }

    @Test
    void displayUrlFallsBackToTheOriginalWhenNoTierIsStored() {
        AppImage internal = new AppImage();
        internal.setExternal(false);
        internal.setSrcKey("gallery/x/original");
        internal.setVariants(new EnumMap<>(ImageSizeOptions.class));

        // No rendition yet — the original is oversized but renderable, which
        // beats handing the board nothing at all.
        assertThat(resolver.displayKey(internal, ImageSizeOptions.MD)).isEqualTo("gallery/x/original");
        assertThat(resolver.displayUrl(internal, ImageSizeOptions.MD))
                .isEqualTo("https://signed/ambi-images/gallery/x/original?sig=abc");

        // A stored tier still wins over the original, at any distance.
        internal.getVariants().put(ImageSizeOptions.XS, "gallery/x/xs.webp");
        assertThat(resolver.displayKey(internal, ImageSizeOptions.MD)).isEqualTo("gallery/x/xs.webp");
    }

    @Test
    void displayUrlPassesExternalImagesThroughAndNullsWhenNothingRenderable() {
        AppImage external = new AppImage();
        external.setExternal(true);
        external.setExternalSrc("https://example.com/cat.png");
        assertThat(resolver.displayUrl(external, ImageSizeOptions.MD))
                .isEqualTo("https://example.com/cat.png");

        // A blank external src, a variant-less internal image, and null all
        // resolve to null rather than a broken URL.
        external.setExternalSrc(" ");
        assertThat(resolver.displayUrl(external, ImageSizeOptions.MD)).isNull();
        AppImage empty = new AppImage();
        empty.setExternal(false);
        assertThat(resolver.displayUrl(empty, ImageSizeOptions.MD)).isNull();
        assertThat(resolver.displayUrl(null, ImageSizeOptions.MD)).isNull();
    }

    @Test
    void urlReusesACachedSignatureWithinTheRefreshWindow() {
        AtomicInteger signings = new AtomicInteger();
        ImageUrlResolver cached = resolverWith(countingPresigner(signings), new FakeClock());

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
        FakeClock clock = new FakeClock();
        // ttl 30m, default margin 15m → reuse window is 15m.
        ImageUrlResolver cached = resolverWith(countingPresigner(signings), clock);

        String first = cached.url("gallery/x/sm.webp");
        clock.advance(Duration.ofMinutes(16)); // past the 15m reuse window
        String second = cached.url("gallery/x/sm.webp");

        // The cache entry expired, so the key was re-signed into a fresh URL.
        assertThat(second).isNotEqualTo(first);
        assertThat(signings.get()).isEqualTo(2);
    }

    @Test
    void urlReSignsWhenTheWallClockJumpsPastTheRefreshWindow() {
        AtomicInteger signings = new AtomicInteger();
        FakeClock clock = new FakeClock();
        ImageUrlResolver cached = resolverWith(countingPresigner(signings), clock);

        String first = cached.url("gallery/x/sm.webp");
        // A host suspend/resume: no runtime elapses, but wall time leaps far past
        // the URL's signed lifetime in one step. The resolver must notice — the
        // regression here was a monotonic-ticker cache that didn't tick through
        // suspend and kept serving the dead URL to every request after resume.
        clock.advance(Duration.ofHours(8));
        String second = cached.url("gallery/x/sm.webp");

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

    @Test
    void rejectsARefreshMarginLongerThanTheTtl() {
        S3Properties s3 = new S3Properties();
        s3.setBucket(BUCKET);
        MediaProperties media = new MediaProperties();
        media.setPresignTtl(Duration.ofMinutes(10));
        media.setPresignRefreshMargin(Duration.ofMinutes(11));

        // A margin past the TTL is a config error; it must fail at startup, not
        // silently degrade into re-signing on every read.
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new ImageUrlResolver(mock(S3Presigner.class), s3, media, readyReadiness(media)))
                .withMessageContaining("presign-refresh-margin");
    }

    private static ImageUrlResolver resolverWith(S3Presigner presigner, Clock clock) {
        S3Properties s3 = new S3Properties();
        s3.setBucket(BUCKET);
        MediaProperties media = new MediaProperties();
        media.setPresignTtl(Duration.ofMinutes(30));
        return new ImageUrlResolver(presigner, s3, media, readyReadiness(media), clock);
    }

    /** Readiness backed by an empty collection — nothing is ever outstanding. */
    private static ImageVariantReadiness readyReadiness(MediaProperties media) {
        PendingImageVariantsRepository repository = mock(PendingImageVariantsRepository.class);
        when(repository.findById(any())).thenReturn(Optional.empty());
        return new ImageVariantReadiness(repository, media);
    }

    /** Virtual wall clock, so URL-expiry tests don't sleep. */
    private static final class FakeClock extends Clock {
        private Instant now = Instant.EPOCH;

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
