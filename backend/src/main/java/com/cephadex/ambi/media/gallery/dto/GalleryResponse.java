package com.cephadex.ambi.media.gallery.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;

import com.cephadex.ambi.common.Ownership;
import com.cephadex.ambi.common.ViewerPermissions;
import com.cephadex.ambi.media.gallery.Gallery;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The metadata view of a {@link Gallery}. Its images are deliberately excluded —
 * they are read through the dedicated {@code /api/galleries/{id}/images}
 * endpoint, so a gallery read stays cheap and never drags every image with it.
 * {@code imageCount} is the only image-derived field, so a client can render the
 * gallery's size without listing it.
 */
public record GalleryResponse(
        @Schema(requiredMode = REQUIRED) String id,
        @Schema(requiredMode = REQUIRED) String name,
        @Schema(requiredMode = REQUIRED) Ownership ownership,
        String organizationId,
        @Schema(requiredMode = REQUIRED) String creatorUserId,
        @Schema(requiredMode = REQUIRED) Long version,
        @Schema(requiredMode = REQUIRED) long imageCount,
        @Schema(requiredMode = REQUIRED) Instant createdAt,
        @Schema(requiredMode = REQUIRED) Instant updatedAt,
        @Schema(requiredMode = REQUIRED) ViewerPermissions permissions) {

    public static GalleryResponse from(Gallery gallery, long imageCount, ViewerPermissions permissions) {
        return new GalleryResponse(
                gallery.getId(),
                gallery.getName(),
                gallery.getOwnership(),
                gallery.getOrganizationId(),
                gallery.getCreatorUserId(),
                gallery.getVersion(),
                imageCount,
                gallery.getCreatedAt(),
                gallery.getUpdatedAt(),
                permissions);
    }
}
