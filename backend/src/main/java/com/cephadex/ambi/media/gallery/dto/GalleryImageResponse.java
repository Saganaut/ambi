package com.cephadex.ambi.media.gallery.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.gallery.GalleryImage;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The wire view of a {@link GalleryImage}. The {@code image} is the embeddable
 * {@link AppImage} value a client copies into a usage site (deck/slide cover or
 * background, avatar, theme asset) via that resource's own image endpoint.
 *
 * <p>The stored {@code image} holds opaque S3 keys; the central
 * {@code AppImageSerializer} presigns them to short-lived URLs on the way out, so
 * this mapper just hands the raw value through.
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
        return new GalleryImageResponse(
                galleryImage.getId(),
                galleryImage.getGalleryId(),
                galleryImage.getImage(),
                galleryImage.getName(),
                galleryImage.getCreatorUserId(),
                galleryImage.getCreatedAt(),
                galleryImage.getUpdatedAt());
    }
}
