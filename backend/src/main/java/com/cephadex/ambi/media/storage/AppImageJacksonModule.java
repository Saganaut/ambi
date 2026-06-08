package com.cephadex.ambi.media.storage;

import org.springframework.stereotype.Component;

import com.cephadex.ambi.media.AppImage;

import tools.jackson.databind.module.SimpleModule;

/**
 * Registers the {@link AppImage} HTTP (de)serializers onto the application's
 * Jackson 3 {@code JsonMapper} (the mapper Spring Boot 4's web stack uses).
 * Spring Boot auto-detects any {@code JacksonModule} bean and applies it, so
 * declaring this {@code @Component} is enough to make image presigning-on-read
 * and key-reconstruction-on-write apply everywhere an {@code AppImage} crosses
 * the HTTP boundary — gallery, slide, deck and theme responses alike.
 */
@Component
public class AppImageJacksonModule extends SimpleModule {

    public AppImageJacksonModule(ImageUrlResolver resolver) {
        addSerializer(AppImage.class, new AppImageSerializer(resolver));
        addDeserializer(AppImage.class, new AppImageDeserializer(resolver));
    }
}
