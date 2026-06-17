package com.cephadex.ambi.media.storage;

import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.Map;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.Placement;
import com.cephadex.ambi.media.enums.ImageSizeOptions;

import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.JavaType;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ValueDeserializer;

/**
 * Central HTTP deserializer for {@link AppImage} (Jackson 3). Its job is to keep
 * the (expiring) presigned URLs the {@link AppImageSerializer} hands out from
 * ever being persisted: when a client copies an internal image into a usage site
 * (a slide cover, an MCQ option, a theme asset), it echoes back presigned
 * {@code srcKey}/{@code variants} URLs — which we turn back into raw S3 keys
 * (via {@link ImageUrlResolver#keyFromUrl} and {@link ImageKeys}). So the stored
 * shape is always keys, regardless of what the wire carried.
 *
 * <p>External images (and internal ones lacking a recognizable {@code srcKey})
 * keep what they were sent.
 */
public class AppImageDeserializer extends ValueDeserializer<AppImage> {

    private final ImageUrlResolver resolver;

    public AppImageDeserializer(ImageUrlResolver resolver) {
        this.resolver = resolver;
    }

    @Override
    public Class<?> handledType() {
        return AppImage.class;
    }

    @Override
    public AppImage deserialize(JsonParser p, DeserializationContext ctxt) {
        JsonNode node = ctxt.readTree(p);

        AppImage image = new AppImage();
        image.setId(text(node, "id"));
        image.setExternal(node.path("external").asBoolean(false));
        image.setExternalSrc(text(node, "externalSrc"));
        image.setAltText(text(node, "altText"));
        if (node.hasNonNull("metadata")) {
            JavaType mapType = ctxt.getTypeFactory()
                    .constructMapType(LinkedHashMap.class, String.class, Object.class);
            image.setMetadata(ctxt.readTreeAsValue(node.get("metadata"), mapType));
        }
        if (node.hasNonNull("placement")) {
            image.setPlacement(ctxt.readTreeAsValue(node.get("placement"), Placement.class));
        }

        if (image.isExternal()) {
            image.setSrcKey(text(node, "srcKey"));
            if (node.hasNonNull("variants")) {
                image.setVariants(readVariants(node.get("variants")));
            }
            return image;
        }

        // Internal: recover the raw original key from the (presigned) srcKey, then
        // rebuild canonical variant keys — discarding any echoed-back presigned
        // URLs so they can never be persisted.
        String srcKey = resolver.keyFromUrl(text(node, "srcKey"));
        image.setSrcKey(srcKey);
        Map<ImageSizeOptions, String> reconstructed = ImageKeys.variantsFor(srcKey);
        if (reconstructed != null) {
            image.setVariants(reconstructed);
        } else if (node.hasNonNull("variants")) {
            // No usable srcKey to rebuild from — un-sign whatever variants we got.
            Map<ImageSizeOptions, String> variants = new EnumMap<>(ImageSizeOptions.class);
            readVariants(node.get("variants"))
                    .forEach((tier, val) -> variants.put(tier, resolver.keyFromUrl(val)));
            image.setVariants(variants);
        }
        return image;
    }

    private static Map<ImageSizeOptions, String> readVariants(JsonNode variantsNode) {
        Map<ImageSizeOptions, String> map = new LinkedHashMap<>();
        for (Map.Entry<String, JsonNode> e : variantsNode.properties()) {
            map.put(ImageSizeOptions.valueOf(e.getKey()), e.getValue().asString());
        }
        return map;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asString();
    }
}
