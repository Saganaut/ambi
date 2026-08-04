package com.cephadex.ambi.media.storage;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.EnumMap;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;

/** The S3 key scheme: derivation from an original key, and delete-key gathering. */
class ImageKeysTest {

    @Test
    void variantsForDerivesEveryTierFromOriginalKey() {
        Map<ImageSizeOptions, String> variants = ImageKeys.variantsFor("gallery/abc/original");

        assertThat(variants).containsOnlyKeys(ImageSizeOptions.values());
        assertThat(variants.get(ImageSizeOptions.SM)).isEqualTo("gallery/abc/sm.webp");
        assertThat(variants.get(ImageSizeOptions.XL)).isEqualTo("gallery/abc/xl.webp");
    }

    @Test
    void variantsForReturnsNullForNonOriginalKey() {
        assertThat(ImageKeys.variantsFor("gallery/abc/sm.webp")).isNull();
        assertThat(ImageKeys.variantsFor(null)).isNull();
    }

    @Test
    void allKeysGathersOriginalPlusVariantsForInternalImage() {
        Map<ImageSizeOptions, String> variants = new EnumMap<>(ImageSizeOptions.class);
        variants.put(ImageSizeOptions.SM, "gallery/abc/sm.webp");
        variants.put(ImageSizeOptions.LG, "gallery/abc/lg.webp");
        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey("gallery/abc/original");
        image.setVariants(variants);

        assertThat(ImageKeys.allKeys(image))
                .containsExactlyInAnyOrder(
                        "gallery/abc/original", "gallery/abc/sm.webp", "gallery/abc/lg.webp");
    }

    @Test
    void newDeckImagePrefixMintsUniquePrefixesTheKeySchemeCanDeriveFrom() {
        String prefix = ImageKeys.newDeckImagePrefix("deck-1");

        assertThat(prefix).startsWith("deck/deck-1/");
        assertThat(prefix).isNotEqualTo(ImageKeys.newDeckImagePrefix("deck-1"));
        // Canonical layout: the derivation from the original key still applies.
        assertThat(ImageKeys.prefixOf(ImageKeys.originalKey(prefix))).isEqualTo(prefix);
        assertThat(ImageKeys.variantsFor(ImageKeys.originalKey(prefix)))
                .containsEntry(ImageSizeOptions.SM, prefix + "/sm.webp");
    }

    @Test
    void allKeysIsEmptyForExternalImage() {
        AppImage external = new AppImage();
        external.setExternal(true);
        external.setExternalSrc("https://example.com/cat.png");

        assertThat(ImageKeys.allKeys(external)).isEmpty();
    }
}
