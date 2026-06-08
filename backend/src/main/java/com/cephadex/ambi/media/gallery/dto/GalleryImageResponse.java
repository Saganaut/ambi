package com.cephadex.ambi.media.gallery.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.gallery.GalleryImage;
import com.cephadex.ambi.media.storage.ImageUrlResolver;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The wire view of a {@link GalleryImage}. The {@code image} is the embeddable
 * {@link AppImage} value a client copies into a usage site (deck/slide cover or
 * background, avatar, theme asset) via that resource's own image endpoint.
 *
 * <p>An internal image stores opaque S3 keys in its {@code variants}; the
 * {@link #from(GalleryImage, ImageUrlResolver)} overload hydrates those to
 * renderable proxy URLs so the client receives ready-to-render values (and copies
 * those hydrated URLs onward when the image is selected). The bare
 * {@link #from(GalleryImage)} leaves the stored shape untouched.
 */
public record GalleryImageResponse(
        @Schema(requiredMode = REQUIRED) String id,
        @Schema(requiredMode = REQUIRED) String galleryId,
        @Schema(requiredMode = REQUIRED) AppImage image,
        String name,
        @Schema(requiredMode = REQUIRED) String creatorUserId,
        @Schema(requiredMode = REQUIRED) Instant createdAt,
        @Schema(requiredMode = REQUIRED) Instant updatedAt) {

    public static GalleryImageResponse from(GalleryImage galleryImage) {
        return from(galleryImage, galleryImage.getImage());
    }

    /** As {@link #from(GalleryImage)}, but with the image hydrated to URLs. */
    public static GalleryImageResponse from(GalleryImage galleryImage, ImageUrlResolver resolver) {
        return from(galleryImage, resolver.hydrate(galleryImage.getImage()));
    }

    private static GalleryImageResponse from(GalleryImage galleryImage, AppImage image) {
        return new GalleryImageResponse(
                galleryImage.getId(),
                galleryImage.getGalleryId(),
                image,
                galleryImage.getName(),
                galleryImage.getCreatorUserId(),
                galleryImage.getCreatedAt(),
                galleryImage.getUpdatedAt());
    }
}
