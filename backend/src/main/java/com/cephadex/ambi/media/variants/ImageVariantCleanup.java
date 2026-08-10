package com.cephadex.ambi.media.variants;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.media.storage.ImageKeys;

/**
 * Drops pending rows for images whose objects have been deleted, best-effort.
 *
 * <p>Every image delete site — gallery, deck placement, deck delete, replaced
 * drawing — has the same shape: the S3 delete is already best-effort (a failure
 * orphans bytes rather than failing the user's edit), and the row must be no
 * stricter. A leaked row is harmless in itself, since nothing can read the image
 * it describes; it is only swept so a repair sweep never re-enqueues work for
 * bytes that are gone.
 *
 * <p>The readiness cache is deliberately not invalidated here: its entry
 * describes an image no reader can reach any more.
 */
@Service
public class ImageVariantCleanup {

    private static final Logger log = LoggerFactory.getLogger(ImageVariantCleanup.class);

    private final PendingImageVariantsRepository repository;

    public ImageVariantCleanup(PendingImageVariantsRepository repository) {
        this.repository = repository;
    }

    /** Forget one image, addressed by any of its stored keys. */
    public void forget(String keyRoot) {
        if (keyRoot == null || keyRoot.isBlank()) {
            return;
        }
        try {
            repository.deleteById(keyRoot);
        } catch (RuntimeException e) {
            log.warn("Could not drop the pending-variants row for {} — leaving it orphaned", keyRoot, e);
        }
    }

    /**
     * Forget every image whose original appears in {@code deletedKeys}. Variant
     * keys in the collection are ignored — only an {@code …/original} names a
     * key root.
     */
    public void forgetAll(Collection<String> deletedKeys) {
        List<String> keyRoots = new ArrayList<>();
        for (String key : deletedKeys) {
            String keyRoot = ImageKeys.prefixOf(key);
            if (keyRoot != null) {
                keyRoots.add(keyRoot);
            }
        }
        if (keyRoots.isEmpty()) {
            return;
        }
        try {
            repository.deleteAllById(keyRoots);
        } catch (RuntimeException e) {
            log.warn("Could not drop {} pending-variants rows — leaving them orphaned", keyRoots.size(), e);
        }
    }

    /** Forget every image under a whole namespace (a deck's {@code deck/{id}/}). */
    public void forgetPrefix(String prefix) {
        try {
            repository.deleteByKeyRootPrefix(prefix);
        } catch (RuntimeException e) {
            log.warn("Could not drop the pending-variants rows under {} — leaving them orphaned", prefix, e);
        }
    }
}
