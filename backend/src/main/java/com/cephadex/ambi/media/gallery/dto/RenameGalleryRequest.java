package com.cephadex.ambi.media.gallery.dto;

import com.cephadex.ambi.common.validation.ValidationConstants;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Rename a gallery (MANAGE capability). The only mutable piece of gallery
 * metadata — ownership and identifiers are fixed at get-or-create.
 *
 * @param name the new display name
 */
public record RenameGalleryRequest(
        @NotBlank @Size(max = ValidationConstants.NAME_MAX) String name) {
}
