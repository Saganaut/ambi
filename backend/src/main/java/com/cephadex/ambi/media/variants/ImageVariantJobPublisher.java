package com.cephadex.ambi.media.variants;

/**
 * Hands a rendition job to whatever carries it to the worker.
 *
 * <p>Implementations are best-effort by contract: a job that never leaves the
 * building leaves the {@link PendingImageVariants} row exactly as it was, so the
 * image serves its original and a repair sweep can re-publish. Callers therefore
 * never fail an upload on a publish failure — but they must still open the row
 * first, or a lost job would leave the image advertising renditions that don't
 * exist.
 */
public interface ImageVariantJobPublisher {

    /** Enqueue {@code job}. May throw; the caller logs and carries on. */
    void publish(ImageVariantJobMessage job);
}
