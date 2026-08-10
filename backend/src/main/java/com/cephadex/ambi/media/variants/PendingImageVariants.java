package com.cephadex.ambi.media.variants;

import java.util.EnumSet;
import java.util.Set;

import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.common.Auditable;
import com.cephadex.ambi.media.enums.ImageSizeOptions;

import lombok.Getter;
import lombok.Setter;

/**
 * One image whose WebP renditions are not all in the bucket yet — the read-side
 * truth behind an {@code AppImage}'s canonical (and therefore optimistic)
 * variants map.
 *
 * <p>The document id <em>is</em> the key root every object of that image lives
 * under ({@code gallery/{uuid}}, {@code deck/{deckId}/{uuid}},
 * {@code drawing/…/{uuid}}), so a reader holding a {@code srcKey} can look the
 * row up without an index or a join.
 *
 * <p><strong>Absence is permanent.</strong> A row is written before its key root
 * can be observed by any reader and deleted the moment {@code readyTiers}
 * covers {@code requestedTiers}. So "no row" means every canonical tier is real
 * — for a legacy image, a completed one, or a fully-copied adoption alike — and
 * that answer can never later become false. That is what lets
 * {@link ImageVariantReadiness} cache absence forever.
 *
 * <p>There is deliberately no TTL index: reaping a permanently-failed row would
 * flip it from "the original is all we have" to "all five tiers are real", and
 * every rendition URL would 404.
 */
@Getter
@Setter
@Document(collection = "pending_image_variants")
public class PendingImageVariants extends Auditable {

    /** The tiers this image was enqueued for; the row dies when all are ready. */
    @Field("requested_tiers")
    private Set<ImageSizeOptions> requestedTiers = EnumSet.noneOf(ImageSizeOptions.class);

    /** Tiers the worker has confirmed are stored — unioned, never replaced. */
    @Field("ready_tiers")
    private Set<ImageSizeOptions> readyTiers = EnumSet.noneOf(ImageSizeOptions.class);

    /** The original's MIME type, so a repair sweep can re-publish the job. */
    @Field("content_type")
    private String contentType;

    /** The worker gave up on the remaining tiers; only a repair can revive them. */
    private boolean terminal;

    /** How many completion reports have landed on this row. */
    private int attempts;

    /** The tiers still missing — what a reader must not be handed a URL for. */
    public Set<ImageSizeOptions> unreadyTiers() {
        Set<ImageSizeOptions> unready = EnumSet.noneOf(ImageSizeOptions.class);
        if (requestedTiers != null) {
            unready.addAll(requestedTiers);
        }
        if (readyTiers != null) {
            unready.removeAll(readyTiers);
        }
        return unready;
    }
}
