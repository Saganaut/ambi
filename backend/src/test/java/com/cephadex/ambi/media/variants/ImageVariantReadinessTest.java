package com.cephadex.ambi.media.variants;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.media.storage.MediaProperties;

/**
 * The caching contract of {@link ImageVariantReadiness}: absence is cached
 * forever (it is monotone — a row is written before its key root can be
 * observed and never reappears), a pending answer is re-read after
 * {@code pending-cache-ttl}, and a completion callback drops its entry at once.
 * A virtual {@link Clock} drives expiry so nothing sleeps, and the repository
 * call count is the assertion that says whether the cache did its job.
 */
class ImageVariantReadinessTest {

    private static final String KEY_ROOT = "gallery/abc";

    private PendingImageVariantsRepository repository;
    private FakeClock clock;
    private ImageVariantReadiness readiness;

    @BeforeEach
    void setUp() {
        repository = mock(PendingImageVariantsRepository.class);
        when(repository.findById(any())).thenReturn(Optional.empty());
        MediaProperties props = new MediaProperties();
        props.getVariants().setPendingCacheTtl(Duration.ofSeconds(10));
        clock = new FakeClock();
        readiness = new ImageVariantReadiness(repository, props, clock);
    }

    @Test
    void absenceOfARowMeansEverythingIsReady() {
        assertThat(readiness.unreadyTiers(KEY_ROOT)).isEmpty();
    }

    @Test
    void absenceIsCachedForeverAndCostsOneRead() {
        readiness.unreadyTiers(KEY_ROOT);
        // Far beyond any TTL: "no row" cannot become "some tier is missing", so
        // re-reading it would be pure waste on the hottest path in the app.
        clock.advance(Duration.ofDays(30));
        readiness.unreadyTiers(KEY_ROOT);

        assertThat(readiness.unreadyTiers(KEY_ROOT)).isEmpty();
        verify(repository, times(1)).findById(KEY_ROOT);
    }

    @Test
    void aPendingRowReportsOnlyWhatIsStillMissing() {
        stubRow(EnumSet.allOf(ImageSizeOptions.class), EnumSet.of(ImageSizeOptions.XS, ImageSizeOptions.SM));

        assertThat(readiness.unreadyTiers(KEY_ROOT)).containsExactlyInAnyOrder(
                ImageSizeOptions.MD, ImageSizeOptions.LG, ImageSizeOptions.XL);
    }

    @Test
    void aPendingAnswerIsRereadOnceItsTtlElapses() {
        stubRow(EnumSet.allOf(ImageSizeOptions.class), EnumSet.noneOf(ImageSizeOptions.class));
        assertThat(readiness.unreadyTiers(KEY_ROOT)).hasSize(5);

        // Within the window the stale answer stands, even though the row is done.
        when(repository.findById(KEY_ROOT)).thenReturn(Optional.empty());
        clock.advance(Duration.ofSeconds(9));
        assertThat(readiness.unreadyTiers(KEY_ROOT)).hasSize(5);

        // Past it, the completion becomes visible without anyone invalidating —
        // which is what bounds the staleness when the callback lands on another
        // instance.
        clock.advance(Duration.ofSeconds(2));
        assertThat(readiness.unreadyTiers(KEY_ROOT)).isEmpty();
    }

    @Test
    void invalidateMakesACompletionVisibleImmediately() {
        stubRow(EnumSet.allOf(ImageSizeOptions.class), EnumSet.noneOf(ImageSizeOptions.class));
        assertThat(readiness.unreadyTiers(KEY_ROOT)).hasSize(5);

        when(repository.findById(KEY_ROOT)).thenReturn(Optional.empty());
        readiness.invalidate(KEY_ROOT);

        assertThat(readiness.unreadyTiers(KEY_ROOT)).isEmpty();
    }

    @Test
    void anUnrecognizableKeyRootIsReadyWithoutAskingMongo() {
        // ImageKeys.prefixOf hands back null for an external image or a srcKey
        // that isn't an original — never a reason to hit the collection.
        assertThat(readiness.unreadyTiers(null)).isEmpty();
        assertThat(readiness.unreadyTiers(" ")).isEmpty();

        verify(repository, times(0)).findById(any());
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private void stubRow(Set<ImageSizeOptions> requested, Set<ImageSizeOptions> ready) {
        PendingImageVariants row = new PendingImageVariants();
        row.setId(KEY_ROOT);
        row.setRequestedTiers(requested);
        row.setReadyTiers(ready);
        when(repository.findById(KEY_ROOT)).thenReturn(Optional.of(row));
    }

    /** Virtual wall clock, so cache-expiry tests don't sleep. */
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
