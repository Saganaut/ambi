package com.cephadex.ambi.presentation.deck;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.media.storage.ImageKeys;
import com.cephadex.ambi.media.storage.S3StorageService;
import com.cephadex.ambi.media.variants.ImageVariantCleanup;
import com.cephadex.ambi.media.variants.ImageVariantRequests;

/**
 * Copy-on-select ownership of a deck's images. Placing an image into a deck
 * <em>adopts</em> it: the S3 objects are copied into the deck's own
 * {@code deck/{deckId}/} namespace and the embedded {@link AppImage} is
 * rewritten to the copies, so deleting the source gallery image can never
 * blank a deck. The reverse edge frees deck-owned objects when their placement
 * disappears (slide delete, item/option removal, image replace or clear, deck
 * delete).
 *
 * <p>Failure ordering: copies happen <em>before</em> the deck is persisted (a
 * failed save orphans only deck-prefix copies, which the deck's own delete
 * sweeps); deletes happen <em>after</em>, best-effort — a failed delete leaves
 * orphaned objects rather than failing the user's edit.
 *
 * <p>Adoption is the second place a key root is minted, so it carries the same
 * readiness obligation as ingest: a tier whose source object wasn't there to
 * copy is missing under the new prefix too, and the copy has to say so before
 * the rewritten {@link AppImage} escapes.
 */
@Service
public class DeckImageLifecycleService {

    private static final Logger log = LoggerFactory.getLogger(DeckImageLifecycleService.class);

    /** Where {@code ImageIngestService} records the original's MIME type. */
    private static final String CONTENT_TYPE_METADATA = "originalContentType";

    private final S3StorageService storage;
    private final ImageVariantRequests variantRequests;
    private final ImageVariantCleanup variantCleanup;

    public DeckImageLifecycleService(S3StorageService storage, ImageVariantRequests variantRequests,
            ImageVariantCleanup variantCleanup) {
        this.storage = storage;
        this.variantRequests = variantRequests;
        this.variantCleanup = variantCleanup;
    }

    /** Adopt every embedded image not already owned by this deck (in place). */
    public void adoptImages(Deck deck) {
        for (AppImage image : DeckImages.images(deck)) {
            adoptImage(deck.getId(), image);
        }
    }

    /**
     * Adopt one image: copy its original and every recorded variant to
     * canonical keys under a fresh {@code deck/{deckId}/{uuid}} prefix and
     * rewrite the (mutable) {@link AppImage} to them. External images, images
     * with no stored key, and images already under this deck's namespace are
     * left untouched. A missing source object is tolerated — the original's key
     * is rewritten anyway, rendering exactly as broken as before.
     *
     * <p>Only tiers whose copy actually landed are recorded, and the rest open a
     * pending row (plus a render job) under the new prefix before this returns.
     * The source is routinely short a tier: it may still be mid-render itself,
     * or have failed permanently. Recording keys for copies that didn't happen
     * would hand every reader of the adopted image a URL to an object that was
     * never there.
     */
    public void adoptImage(String deckId, AppImage image) {
        if (image == null || image.isExternal()
                || image.getSrcKey() == null || image.getSrcKey().isBlank()
                || ImageKeys.isOwnedByDeck(image.getSrcKey(), deckId)) {
            return;
        }
        String prefix = ImageKeys.newDeckImagePrefix(deckId);
        String srcKey = ImageKeys.originalKey(prefix);
        boolean originalCopied = storage.copyIfExists(image.getSrcKey(), srcKey);

        Map<ImageSizeOptions, String> sources = image.getVariants();
        Map<ImageSizeOptions, String> adopted = new EnumMap<>(ImageSizeOptions.class);
        Set<ImageSizeOptions> missing = EnumSet.noneOf(ImageSizeOptions.class);
        for (ImageSizeOptions tier : ImageSizeOptions.values()) {
            String source = sources == null ? null : sources.get(tier);
            String key = ImageKeys.variantKey(prefix, tier);
            if (source != null && !source.isBlank() && storage.copyIfExists(source, key)) {
                adopted.put(tier, key);
            } else {
                missing.add(tier);
            }
        }
        image.setVariants(adopted);
        image.setSrcKey(srcKey);

        if (missing.isEmpty()) {
            return;
        }
        String contentType = contentTypeOf(image);
        variantRequests.open(prefix, missing, contentType);
        if (originalCopied) {
            variantRequests.publish(prefix, srcKey, missing, contentType);
        } else {
            // Nothing to render from: the row still has to exist so the missing
            // tiers stay hidden, but a job would only fail its way to terminal.
            log.warn("Adopted image {} for deck {} has no source original — its renditions cannot be rendered",
                    prefix, deckId);
        }
    }

    /** The original's MIME type as ingest recorded it, or {@code null}. */
    private static String contentTypeOf(AppImage image) {
        Map<String, Object> metadata = image.getMetadata();
        Object contentType = metadata == null ? null : metadata.get(CONTENT_TYPE_METADATA);
        return contentType instanceof String type ? type : null;
    }

    /**
     * Free the deck-owned objects whose placements this save removed: the keys
     * in {@code beforeKeys} but not {@code afterKeys}, restricted to the deck's
     * own namespace — never gallery (or other shared) keys. Best-effort: called
     * after the save, and a failure only orphans objects.
     */
    public void cleanupRemoved(String deckId, Set<String> beforeKeys, Set<String> afterKeys) {
        List<String> removed = beforeKeys.stream()
                .filter(key -> !afterKeys.contains(key))
                .filter(key -> ImageKeys.isOwnedByDeck(key, deckId))
                .toList();
        if (removed.isEmpty()) {
            return;
        }
        try {
            storage.delete(removed);
        } catch (RuntimeException e) {
            log.warn("Could not delete removed image objects of deck {} — leaving them orphaned",
                    deckId, e);
        }
        variantCleanup.forgetAll(removed);
    }

    /** Free everything under the deck's namespace (deck delete). Best-effort. */
    public void deleteAllImages(String deckId) {
        try {
            storage.deletePrefix(ImageKeys.deckPrefix(deckId));
        } catch (RuntimeException e) {
            log.warn("Could not delete image objects of deck {} — leaving them orphaned",
                    deckId, e);
        }
        variantCleanup.forgetPrefix(ImageKeys.deckPrefix(deckId));
    }
}
