package com.cephadex.ambi.media.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.time.Duration;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.media.variants.ImageVariantReadiness;
import com.cephadex.ambi.media.variants.PendingImageVariants;
import com.cephadex.ambi.media.variants.PendingImageVariantsRepository;

import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import tools.jackson.databind.json.JsonMapper;

/**
 * Round-trips {@link AppImage} through a <em>Jackson 3</em> {@link JsonMapper}
 * carrying the {@link AppImageSerializer}/{@link AppImageDeserializer} pair — the
 * same Jackson the Spring Boot 4 web stack uses. Reads presign srcKey + variant
 * keys and drop whatever is not rendered yet; writes reconstruct all five
 * canonical keys, so an echoed-back presigned URL is never persisted and a tier
 * hidden on the way out is not lost on the way back in.
 */
class AppImageJacksonTest {

    private static final String BUCKET = "ambi-images";
    private JsonMapper mapper;
    private PendingImageVariantsRepository pendingVariants;

    @BeforeEach
    void setUp() {
        // Stub the presigner to emit a path-style URL ({endpoint}/{bucket}/{key}),
        // so keyFromUrl's prefix-strip is exercised for real.
        S3Presigner presigner = mock(S3Presigner.class);
        when(presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenAnswer(inv -> {
            GetObjectPresignRequest req = inv.getArgument(0);
            String key = req.getObjectRequest().key();
            PresignedGetObjectRequest presigned = mock(PresignedGetObjectRequest.class);
            when(presigned.url())
                    .thenReturn(URI.create("https://garage.local/" + BUCKET + "/" + key + "?sig=x").toURL());
            return presigned;
        });
        S3Properties s3 = new S3Properties();
        s3.setBucket(BUCKET);
        MediaProperties media = new MediaProperties();
        media.setPresignTtl(Duration.ofMinutes(30));
        pendingVariants = mock(PendingImageVariantsRepository.class);
        when(pendingVariants.findById(any())).thenReturn(Optional.empty());
        ImageUrlResolver resolver = new ImageUrlResolver(presigner, s3, media,
                new ImageVariantReadiness(pendingVariants, media));

        mapper = JsonMapper.builder().addModule(new AppImageJacksonModule(resolver)).build();
    }

    /** A pending row leaving {@code unready} outstanding under {@code keyRoot}. */
    private void pending(String keyRoot, ImageSizeOptions... unready) {
        PendingImageVariants row = new PendingImageVariants();
        row.setId(keyRoot);
        row.setRequestedTiers(EnumSet.copyOf(List.of(unready)));
        when(pendingVariants.findById(keyRoot)).thenReturn(Optional.of(row));
    }

    private static AppImage internal() {
        Map<ImageSizeOptions, String> variants = new EnumMap<>(ImageSizeOptions.class);
        variants.put(ImageSizeOptions.SM, "gallery/abc/sm.webp");
        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey("gallery/abc/original");
        image.setVariants(variants);
        return image;
    }

    @Test
    void serializePresignsSrcKeyAndVariants() {
        String json = mapper.writeValueAsString(internal());

        assertThat(json).contains("\"srcKey\":\"https://garage.local/ambi-images/gallery/abc/original?sig=x\"");
        assertThat(json).contains("\"SM\":\"https://garage.local/ambi-images/gallery/abc/sm.webp?sig=x\"");
    }

    @Test
    void serializeEmitsOnlyTheTiersThatAreRenderedYet() {
        // The stored image always carries all five canonical keys; the pending
        // row is the only thing that says which of them are objects. A client
        // must never receive a URL for one that isn't.
        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey("gallery/abc/original");
        image.setVariants(ImageKeys.variantsFor("gallery/abc/original"));
        pending("gallery/abc", ImageSizeOptions.MD, ImageSizeOptions.LG, ImageSizeOptions.XL);

        String json = mapper.writeValueAsString(image);

        assertThat(json).contains("\"XS\":\"https://garage.local/ambi-images/gallery/abc/xs.webp?sig=x\"");
        assertThat(json).contains("\"SM\":\"https://garage.local/ambi-images/gallery/abc/sm.webp?sig=x\"");
        assertThat(json).doesNotContain("md.webp").doesNotContain("lg.webp").doesNotContain("xl.webp");
    }

    @Test
    void deserializeReconstructsRawKeysFromPresignedSrcKey() {
        // A client echoes the presigned URLs back after selecting the image.
        String json = """
                {
                  "external": false,
                  "srcKey": "https://garage.local/ambi-images/gallery/abc/original?sig=x",
                  "variants": { "SM": "https://garage.local/ambi-images/gallery/abc/sm.webp?sig=x" }
                }
                """;

        AppImage image = mapper.readValue(json, AppImage.class);

        assertThat(image.getSrcKey()).isEqualTo("gallery/abc/original");
        assertThat(image.getVariants()).containsOnlyKeys(ImageSizeOptions.values());
        assertThat(image.getVariants().get(ImageSizeOptions.SM)).isEqualTo("gallery/abc/sm.webp");
    }

    @Test
    void roundTripLeavesStoredKeysCanonical() {
        AppImage back = mapper.readValue(mapper.writeValueAsString(internal()), AppImage.class);

        assertThat(back.getSrcKey()).isEqualTo("gallery/abc/original");
        assertThat(back.getVariants().get(ImageSizeOptions.SM)).isEqualTo("gallery/abc/sm.webp");
    }

    @Test
    void externalImageRoundTripsUnchanged() {
        AppImage external = new AppImage();
        external.setExternal(true);
        external.setExternalSrc("https://example.com/cat.png");

        AppImage back = mapper.readValue(mapper.writeValueAsString(external), AppImage.class);

        assertThat(back.isExternal()).isTrue();
        assertThat(back.getExternalSrc()).isEqualTo("https://example.com/cat.png");
    }
}
