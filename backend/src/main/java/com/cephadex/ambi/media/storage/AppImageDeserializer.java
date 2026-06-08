package com.cephadex.ambi.media.storage;

import java.io.IOException;
import java.util.Map;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;

/**
 * Central HTTP deserializer for {@link AppImage}. Its job is to keep the
 * (expiring) presigned URLs the {@link AppImageSerializer} hands out from ever
 * being persisted: when a client copies an internal image into a usage site
 * (a slide cover, an MCQ option, a theme asset), it echoes back the presigned
 * {@code variants} — which we discard and rebuild as canonical S3 keys from the
 * raw {@code srcKey} via {@link ImageKeys}. So the stored shape is always keys,
 * regardless of what the wire carried.
 *
 * <p>External images (and internal ones lacking a recognizable {@code srcKey})
 * keep their {@code variants} as received.
 */
public class AppImageDeserializer extends StdDeserializer<AppImage> {

    private static final TypeReference<Map<ImageSizeOptions, String>> VARIANTS_TYPE =
            new TypeReference<>() {
            };
    private static final TypeReference<Map<String, Object>> METADATA_TYPE =
            new TypeReference<>() {
            };

    public AppImageDeserializer() {
        super(AppImage.class);
    }

    @Override
    public AppImage deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        ObjectMapper mapper = (ObjectMapper) p.getCodec();
        JsonNode node = mapper.readTree(p);

        AppImage image = new AppImage();
        image.setId(text(node, "id"));
        image.setExternal(node.path("external").asBoolean(false));
        image.setSrcKey(text(node, "srcKey"));
        image.setExternalSrc(text(node, "externalSrc"));
        image.setAltText(text(node, "altText"));
        if (node.hasNonNull("metadata")) {
            image.setMetadata(mapper.convertValue(node.get("metadata"), METADATA_TYPE));
        }

        // For an internal image, rebuild variants from the original key so an
        // echoed-back presigned URL can never be persisted. Fall back to the
        // provided variants only when there's nothing to reconstruct from.
        Map<ImageSizeOptions, String> reconstructed =
                image.isExternal() ? null : ImageKeys.variantsFor(image.getSrcKey());
        if (reconstructed != null) {
            image.setVariants(reconstructed);
        } else if (node.hasNonNull("variants")) {
            image.setVariants(mapper.convertValue(node.get("variants"), VARIANTS_TYPE));
        }
        return image;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }
}
