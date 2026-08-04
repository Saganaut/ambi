package com.cephadex.ambi.media.storage;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;

/**
 * The single authority for an uploaded image's S3 key layout. Every object for
 * one image lives under a shared prefix — {@code gallery/{uuid}} for gallery
 * uploads, {@code drawing/{sessionId}/{participantId}/{uuid}} for live-session
 * drawing answers — with the untouched original at {@code …/original} and one
 * WebP rendition per size tier at {@code …/{tier}.webp}.
 *
 * <p>Because the whole key set is derivable from the original's key, the inbound
 * {@code AppImage} deserializer can reconstruct the canonical variant keys from
 * {@code srcKey} alone — so a copied image never persists the (expiring) presigned
 * URLs a client echoes back. {@link ImageIngestService} mints the keys; the
 * deserializer and delete path read them back through here.
 */
public final class ImageKeys {

    private static final String ORIGINAL_SUFFIX = "/original";

    private ImageKeys() {
    }

    /** The original-object key under a prefix. */
    public static String originalKey(String prefix) {
        return prefix + ORIGINAL_SUFFIX;
    }

    /** A tier's WebP key under a prefix. */
    public static String variantKey(String prefix, ImageSizeOptions tier) {
        return prefix + "/" + tier.name().toLowerCase() + ".webp";
    }

    /**
     * The key namespace every image a deck owns lives under
     * ({@code deck/{deckId}/}) — the ownership boundary deck-image adoption and
     * cleanup key off.
     */
    public static String deckPrefix(String deckId) {
        return "deck/" + deckId + "/";
    }

    /** A fresh per-image prefix under a deck's namespace. */
    public static String newDeckImagePrefix(String deckId) {
        return deckPrefix(deckId) + UUID.randomUUID();
    }

    /** The shared prefix an original key belongs to, or {@code null} if it isn't one. */
    public static String prefixOf(String srcKey) {
        if (srcKey == null || !srcKey.endsWith(ORIGINAL_SUFFIX)) {
            return null;
        }
        return srcKey.substring(0, srcKey.length() - ORIGINAL_SUFFIX.length());
    }

    /**
     * The canonical tier → key map for an image identified by its original
     * {@code srcKey}, or {@code null} when {@code srcKey} is not a recognizable
     * original key (e.g. an external image).
     */
    public static Map<ImageSizeOptions, String> variantsFor(String srcKey) {
        String prefix = prefixOf(srcKey);
        if (prefix == null) {
            return null;
        }
        Map<ImageSizeOptions, String> variants = new EnumMap<>(ImageSizeOptions.class);
        for (ImageSizeOptions tier : ImageSizeOptions.values()) {
            variants.put(tier, variantKey(prefix, tier));
        }
        return variants;
    }

    /**
     * Every stored S3 key backing an internal image — the original plus each
     * variant — for deletion. Empty for an external image (it owns no objects).
     */
    public static List<String> allKeys(AppImage image) {
        List<String> keys = new ArrayList<>();
        if (image == null || image.isExternal()) {
            return keys;
        }
        if (image.getSrcKey() != null) {
            keys.add(image.getSrcKey());
        }
        if (image.getVariants() != null) {
            for (String key : image.getVariants().values()) {
                if (key != null && !keys.contains(key)) {
                    keys.add(key);
                }
            }
        }
        return keys;
    }
}
