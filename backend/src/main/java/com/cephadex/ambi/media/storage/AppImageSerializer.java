package com.cephadex.ambi.media.storage;

import java.io.IOException;

import com.cephadex.ambi.media.AppImage;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;

/**
 * Central HTTP serializer for {@link AppImage}: presigns an internal image's
 * variant keys to short-lived URLs on the way out, so <em>every</em> response
 * that embeds an image (gallery, slide, deck, theme) renders without each DTO
 * having to hydrate. Mongo persistence uses Spring Data's own converter, not
 * Jackson, so stored documents are untouched and keep holding raw keys.
 *
 * <p>Fields are written explicitly (rather than delegating to the default bean
 * serializer, which would recurse) — so a new {@link AppImage} field must be
 * added here too. The {@code variants} values are the only thing transformed;
 * {@code srcKey} stays raw so it can round-trip back as the reconstruction anchor
 * (see {@link AppImageDeserializer}).
 */
public class AppImageSerializer extends StdSerializer<AppImage> {

    private final transient ImageUrlResolver resolver;

    public AppImageSerializer(ImageUrlResolver resolver) {
        super(AppImage.class);
        this.resolver = resolver;
    }

    @Override
    public void serialize(AppImage value, JsonGenerator gen, SerializerProvider provider)
            throws IOException {
        AppImage image = resolver.hydrate(value);
        gen.writeStartObject();
        gen.writeObjectField("id", image.getId());
        gen.writeBooleanField("external", image.isExternal());
        gen.writeObjectField("srcKey", image.getSrcKey());
        gen.writeObjectField("externalSrc", image.getExternalSrc());
        gen.writeObjectField("altText", image.getAltText());
        gen.writeObjectField("variants", image.getVariants());
        gen.writeObjectField("metadata", image.getMetadata());
        gen.writeEndObject();
    }
}
