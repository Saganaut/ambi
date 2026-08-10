package com.cephadex.ambi.media.variants;

import java.util.Set;

import com.cephadex.ambi.media.enums.ImageSizeOptions;

/**
 * Hand-written writes Spring Data can't derive, mixed into
 * {@link PendingImageVariantsRepository} so callers still see one repository.
 *
 * <p>Every one of them is a single atomic document update rather than a
 * load-mutate-{@code save()}: completion reports for the same image arrive
 * concurrently (one queue message per redelivery, several tiers each) and a
 * read-modify-write would silently drop a tier whichever way the race fell.
 * See {@link PendingImageVariantsRepositoryImpl}.
 */
public interface PendingImageVariantsRepositoryCustom {

    /**
     * Record that {@code keyRoot} is missing {@code requested} — an upsert, so a
     * redelivered or retried ingest of the same prefix is harmless and never
     * resurrects tiers a worker has already reported.
     *
     * @param keyRoot     the shared prefix every object of the image lives under
     * @param requested   the tiers the image was enqueued for
     * @param contentType the original's MIME type, for a later repair sweep
     */
    void openPending(String keyRoot, Set<ImageSizeOptions> requested, String contentType);

    /**
     * Union {@code tiers} into the row's ready set (and latch {@code terminal}),
     * reporting whether the row is now complete.
     *
     * @return {@code true} when every requested tier is ready — the caller's cue
     *         to delete the row. {@code false} for a still-partial row <em>and</em>
     *         for an unknown key root, both of which mean "leave it alone".
     */
    boolean recordReady(String keyRoot, Set<ImageSizeOptions> tiers, boolean terminal);

    /**
     * Drop every row whose key root sits under {@code prefix} — the delete-side
     * counterpart to a whole-namespace object sweep (a deck's
     * {@code deck/{deckId}/}). {@code prefix} is matched literally, not as a
     * pattern.
     */
    void deleteByKeyRootPrefix(String prefix);
}
