package com.cephadex.ambi.presentation.deck;

import java.util.EnumMap;
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
 */
@Service
public class DeckImageLifecycleService {

    private static final Logger log = LoggerFactory.getLogger(DeckImageLifecycleService.class);

    private final S3StorageService storage;

    public DeckImageLifecycleService(S3StorageService storage) {
        this.storage = storage;
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
     * left untouched. A missing source object is tolerated — the keys are
     * rewritten anyway, rendering exactly as broken as before.
     */
    public void adoptImage(String deckId, AppImage image) {
        if (image == null || image.isExternal()
                || image.getSrcKey() == null || image.getSrcKey().isBlank()
                || ImageKeys.isOwnedByDeck(image.getSrcKey(), deckId)) {
            return;
        }
        String prefix = ImageKeys.newDeckImagePrefix(deckId);
        String srcKey = ImageKeys.originalKey(prefix);
        storage.copyIfExists(image.getSrcKey(), srcKey);
        Map<ImageSizeOptions, String> variants = image.getVariants();
        if (variants != null && !variants.isEmpty()) {
            Map<ImageSizeOptions, String> adopted = new EnumMap<>(ImageSizeOptions.class);
            for (Map.Entry<ImageSizeOptions, String> variant : variants.entrySet()) {
                if (variant.getValue() == null) {
                    continue;
                }
                String key = ImageKeys.variantKey(prefix, variant.getKey());
                storage.copyIfExists(variant.getValue(), key);
                adopted.put(variant.getKey(), key);
            }
            image.setVariants(adopted);
        }
        image.setSrcKey(srcKey);
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
    }

    /** Free everything under the deck's namespace (deck delete). Best-effort. */
    public void deleteAllImages(String deckId) {
        try {
            storage.deletePrefix(ImageKeys.deckPrefix(deckId));
        } catch (RuntimeException e) {
            log.warn("Could not delete image objects of deck {} — leaving them orphaned",
                    deckId, e);
        }
    }
}
