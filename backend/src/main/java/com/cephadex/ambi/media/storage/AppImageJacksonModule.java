package com.cephadex.ambi.media.storage;

import org.springframework.stereotype.Component;

import com.cephadex.ambi.media.AppImage;
import com.fasterxml.jackson.databind.module.SimpleModule;

/**
 * Registers the {@link AppImage} HTTP (de)serializers onto the application's
 * Jackson {@code ObjectMapper}. Spring Boot auto-detects any {@code Module} bean
 * and applies it, so declaring this {@code @Component} is enough to make image
 * presigning-on-read and key-reconstruction-on-write apply everywhere an
 * {@code AppImage} crosses the HTTP boundary — gallery, slide, deck and theme
 * responses alike.
 */
@Component
public class AppImageJacksonModule extends SimpleModule {

    public AppImageJacksonModule(ImageUrlResolver resolver) {
        addSerializer(AppImage.class, new AppImageSerializer(resolver));
        addDeserializer(AppImage.class, new AppImageDeserializer());
    }
}
