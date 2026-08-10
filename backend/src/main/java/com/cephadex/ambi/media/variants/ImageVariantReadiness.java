package com.cephadex.ambi.media.variants;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.media.storage.MediaProperties;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

/**
 * Answers "which of this image's renditions are not in the bucket yet?" — the
 * one read every image-serving path consults before it hands out a variant URL.
 *
 * <p>An {@code AppImage} carries the <em>canonical</em> key layout, not a claim
 * that every key is stored: {@code AppImageDeserializer} rebuilds all five from
 * {@code srcKey} alone, and ingest returns them before the worker has rendered
 * anything. The {@link PendingImageVariants} row is what makes that map
 * truthful at read time.
 *
 * <p><strong>Absence is cached forever.</strong> A row exists before its key
 * root can be observed and is deleted only when the set is complete, so "no
 * row" is monotone — it can never become "some tier is missing" later. Only the
 * pending answer needs re-reading, on {@code ambi.media.variants.pending-cache-ttl};
 * the instance that handles the completion callback drops its own entry
 * immediately via {@link #invalidate(String)}.
 *
 * <p>Expiry is checked against the <em>wall clock</em> rather than Caffeine's
 * {@code expireAfterWrite}, for the same reason {@code ImageUrlResolver}'s
 * signed-URL cache does: Caffeine ticks on {@code System.nanoTime()}, which
 * pauses while the host is suspended, and a resumed instance would keep serving
 * a stale pending answer for the length of the pause.
 */
@Component
public class ImageVariantReadiness {

    /** A cached answer plus the wall-clock instant after which it must be re-read. */
    private record Readiness(Set<ImageSizeOptions> unready, Instant refreshAt) {
    }

    /** No row: everything is real, and always will be. */
    private static final Readiness ALL_READY = new Readiness(Set.of(), Instant.MAX);

    private final PendingImageVariantsRepository repository;
    private final Duration pendingTtl;
    private final Clock clock;
    /** key root → readiness, re-read once {@code refreshAt} passes; size-bounded only. */
    private final Cache<String, Readiness> cache;

    @Autowired
    public ImageVariantReadiness(PendingImageVariantsRepository repository, MediaProperties props) {
        this(repository, props, Clock.systemUTC());
    }

    /** Package-private seam: lets a test drive cache expiry with a virtual {@link Clock}. */
    ImageVariantReadiness(PendingImageVariantsRepository repository, MediaProperties props, Clock clock) {
        this.repository = repository;
        this.pendingTtl = props.getVariants().getPendingCacheTtl();
        this.clock = clock;
        this.cache = Caffeine.newBuilder()
                .maximumSize(props.getVariants().getStatusCacheMaxSize())
                .build();
    }

    /**
     * The tiers of {@code keyRoot} that are not stored yet. Empty means every
     * canonical key is real — which is also the answer for a {@code null} or
     * blank key root (an external image, or one whose {@code srcKey} isn't a
     * recognizable original).
     */
    public Set<ImageSizeOptions> unreadyTiers(String keyRoot) {
        if (keyRoot == null || keyRoot.isBlank()) {
            return Set.of();
        }
        Instant now = clock.instant();
        return cache.asMap()
                .compute(keyRoot, (root, cached) -> cached != null && now.isBefore(cached.refreshAt())
                        ? cached
                        : load(root, now))
                .unready();
    }

    /** Drop the cached answer for {@code keyRoot} so the next read re-reads the row. */
    public void invalidate(String keyRoot) {
        if (keyRoot != null) {
            cache.invalidate(keyRoot);
        }
    }

    private Readiness load(String keyRoot, Instant now) {
        return repository.findById(keyRoot)
                .map(row -> new Readiness(row.unreadyTiers(), now.plus(pendingTtl)))
                .orElse(ALL_READY);
    }
}
