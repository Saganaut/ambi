package com.cephadex.ambi.media.variants;

import java.time.Instant;
import java.util.List;

import com.cephadex.ambi.media.enums.ImageSizeOptions;

/**
 * The rendition job as it travels to the worker — a cross-language contract, so
 * the field names below are the wire format and renaming one is a breaking
 * change on both sides.
 *
 * <p>{@code version} is checked by the worker, which rejects anything it does
 * not know rather than guessing. Variant keys are deliberately absent: the
 * worker derives {@code {keyRoot}/{tier-lowercase}.webp}, the same rule
 * {@code ImageKeys} applies here, and a test pins that string on both sides.
 * Bounds ride along instead of being duplicated in worker config, so
 * {@code ambi.media.variants.tier-bounds} stays the only place they exist.
 *
 * @param keyRoot     the prefix every object of this image lives under
 * @param srcKey      the untouched original to render from
 * @param bucket      the bucket both sides address
 * @param contentType the original's MIME type
 * @param tiers       what to render, each with its bounding-box edge in px
 * @param requestedAt when ingest enqueued the job
 */
public record ImageVariantJobMessage(
        int version,
        String keyRoot,
        String srcKey,
        String bucket,
        String contentType,
        List<TierRequest> tiers,
        Instant requestedAt) {

    /** The only schema the worker accepts today. */
    public static final int VERSION = 1;

    /** One rendition: the tier and the box its longest edge is fit within. */
    public record TierRequest(ImageSizeOptions tier, int maxEdge) {
    }
}
