package com.cephadex.ambi.media.variants;

import java.time.Instant;
import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * The pending-variant rows, keyed by the image's key root. Reads go through
 * {@link ImageVariantReadiness} (which caches them); the writes worth having are
 * all atomic and live on the {@link PendingImageVariantsRepositoryCustom}
 * fragment.
 */
public interface PendingImageVariantsRepository
        extends MongoRepository<PendingImageVariants, String>, PendingImageVariantsRepositoryCustom {

    /**
     * Rows untouched since {@code cutoff} — jobs that were never enqueued, were
     * lost, or died in the worker. The repair sweep re-publishes these.
     */
    List<PendingImageVariants> findByUpdatedAtBefore(Instant cutoff);
}
