package com.cephadex.ambi.media.storage;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.EnumMap;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;

/**
 * Hydration rules for {@link ImageUrlResolver}: internal variant keys become
 * proxy URLs, external images pass through, and the stored entity is never
 * mutated.
 */
class ImageUrlResolverTest {

    private ImageUrlResolver resolver(String baseUrl) {
        MediaProperties props = new MediaProperties();
        props.setPublicBaseUrl(baseUrl);
        return new ImageUrlResolver(props);
    }

    @Test
    void urlPrefixesProxyPathAndEncodesKey() {
        assertThat(resolver("http://localhost:8080").url("gallery/abc/sm.webp"))
                .isEqualTo("http://localhost:8080/api/images/gallery/abc/sm.webp");
    }

    @Test
    void trailingSlashOnBaseUrlIsNotDoubled() {
        assertThat(resolver("http://localhost:8080/").url("k"))
                .isEqualTo("http://localhost:8080/api/images/k");
    }

    @Test
    void hydrateRewritesInternalVariantsToUrls() {
        Map<ImageSizeOptions, String> variants = new EnumMap<>(ImageSizeOptions.class);
        variants.put(ImageSizeOptions.SM, "gallery/x/sm.webp");
        variants.put(ImageSizeOptions.LG, "gallery/x/lg.webp");
        AppImage stored = new AppImage();
        stored.setExternal(false);
        stored.setSrcKey("gallery/x/original");
        stored.setVariants(variants);

        AppImage hydrated = resolver("http://host").hydrate(stored);

        assertThat(hydrated.getVariants().get(ImageSizeOptions.SM))
                .isEqualTo("http://host/api/images/gallery/x/sm.webp");
        assertThat(hydrated.getVariants().get(ImageSizeOptions.LG))
                .isEqualTo("http://host/api/images/gallery/x/lg.webp");
        // srcKey is preserved (it's the original-object reference, not rendered).
        assertThat(hydrated.getSrcKey()).isEqualTo("gallery/x/original");
        // The stored entity's variants are untouched — still keys.
        assertThat(stored.getVariants().get(ImageSizeOptions.SM)).isEqualTo("gallery/x/sm.webp");
    }

    @Test
    void hydrateLeavesExternalImagesUntouched() {
        AppImage external = new AppImage();
        external.setExternal(true);
        external.setExternalSrc("https://example.com/cat.png");

        assertThat(resolver("http://host").hydrate(external)).isSameAs(external);
    }

    @Test
    void hydrateToleratesNullAndEmpty() {
        ImageUrlResolver resolver = resolver("http://host");
        assertThat(resolver.hydrate(null)).isNull();

        AppImage noVariants = new AppImage();
        noVariants.setExternal(false);
        assertThat(resolver.hydrate(noVariants)).isSameAs(noVariants);
    }
}
