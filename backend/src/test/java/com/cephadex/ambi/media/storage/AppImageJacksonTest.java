package com.cephadex.ambi.media.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.EnumMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;

/**
 * Round-trips {@link AppImage} through an {@link ObjectMapper} carrying the
 * {@link AppImageSerializer}/{@link AppImageDeserializer} pair: reads presign
 * the keys, and writes reconstruct canonical keys from {@code srcKey} so an
 * echoed-back presigned URL is never persisted.
 */
class AppImageJacksonTest {

    private ObjectMapper mapper;

    @BeforeEach
    void setUp() {
        ImageUrlResolver resolver = mock(ImageUrlResolver.class);
        when(resolver.hydrate(org.mockito.ArgumentMatchers.any())).thenAnswer(inv -> {
            // Mirror the real resolver: presign internal variants, pass through external.
            AppImage in = inv.getArgument(0);
            if (in == null || in.isExternal() || in.getVariants() == null) return in;
            Map<ImageSizeOptions, String> signed = new EnumMap<>(ImageSizeOptions.class);
            in.getVariants().forEach((tier, key) -> signed.put(tier, "https://signed/" + key));
            AppImage copy = new AppImage();
            copy.setExternal(false);
            copy.setSrcKey(in.getSrcKey());
            copy.setVariants(signed);
            return copy;
        });

        SimpleModule module = new SimpleModule();
        module.addSerializer(AppImage.class, new AppImageSerializer(resolver));
        module.addDeserializer(AppImage.class, new AppImageDeserializer());
        mapper = new ObjectMapper().registerModule(module);
    }

    @Test
    void serializePresignsInternalVariantKeys() throws Exception {
        Map<ImageSizeOptions, String> variants = new EnumMap<>(ImageSizeOptions.class);
        variants.put(ImageSizeOptions.SM, "gallery/abc/sm.webp");
        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey("gallery/abc/original");
        image.setVariants(variants);

        String json = mapper.writeValueAsString(image);

        // srcKey stays raw; the variant is presigned.
        assertThat(json).contains("\"srcKey\":\"gallery/abc/original\"");
        assertThat(json).contains("\"SM\":\"https://signed/gallery/abc/sm.webp\"");
    }

    @Test
    void deserializeReconstructsVariantKeysFromSrcKey() throws Exception {
        // A client echoes back presigned variant URLs after selecting the image.
        String json = """
                {
                  "external": false,
                  "srcKey": "gallery/abc/original",
                  "variants": { "SM": "https://signed/gallery/abc/sm.webp?sig=x" }
                }
                """;

        AppImage image = mapper.readValue(json, AppImage.class);

        // The presigned URL is discarded; canonical keys are rebuilt from srcKey.
        assertThat(image.getVariants().get(ImageSizeOptions.SM)).isEqualTo("gallery/abc/sm.webp");
        assertThat(image.getVariants()).containsOnlyKeys(ImageSizeOptions.values());
        assertThat(image.getSrcKey()).isEqualTo("gallery/abc/original");
    }

    @Test
    void externalImageRoundTripsUnchanged() throws Exception {
        AppImage external = new AppImage();
        external.setExternal(true);
        external.setExternalSrc("https://example.com/cat.png");

        AppImage back = mapper.readValue(mapper.writeValueAsString(external), AppImage.class);

        assertThat(back.isExternal()).isTrue();
        assertThat(back.getExternalSrc()).isEqualTo("https://example.com/cat.png");
    }
}
