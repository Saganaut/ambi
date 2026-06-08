package com.cephadex.ambi.media.storage;

import com.cephadex.ambi.media.AppImage;

import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;

/**
 * Central HTTP serializer for {@link AppImage} (Jackson 3 — the version Spring
 * Boot 4's web stack uses): presigns an internal image's {@code srcKey} and
 * variant keys to short-lived URLs on the way out, so <em>every</em> response
 * that embeds an image (gallery, slide, deck, theme) renders without each DTO
 * having to hydrate. Mongo persistence uses Spring Data's own converter, not
 * Jackson, so stored documents are untouched and keep holding raw keys.
 *
 * <p>Fields are written explicitly (rather than delegating to the default bean
 * serializer, which would recurse) — so a new {@link AppImage} field must be
 * added here too. Only {@code srcKey}/{@code variants} are transformed.
 */
public class AppImageSerializer extends ValueSerializer<AppImage> {

    private final transient ImageUrlResolver resolver;

    public AppImageSerializer(ImageUrlResolver resolver) {
        this.resolver = resolver;
    }

    @Override
    public Class<AppImage> handledType() {
        return AppImage.class;
    }

    @Override
    public void serialize(AppImage value, JsonGenerator gen, SerializationContext ctxt) {
        AppImage image = resolver.hydrate(value);
        gen.writeStartObject();
        gen.writeName("id");
        gen.writePOJO(image.getId());
        gen.writeName("external");
        gen.writeBoolean(image.isExternal());
        gen.writeName("srcKey");
        gen.writePOJO(image.getSrcKey());
        gen.writeName("externalSrc");
        gen.writePOJO(image.getExternalSrc());
        gen.writeName("altText");
        gen.writePOJO(image.getAltText());
        gen.writeName("variants");
        gen.writePOJO(image.getVariants());
        gen.writeName("metadata");
        gen.writePOJO(image.getMetadata());
        gen.writeEndObject();
    }
}
