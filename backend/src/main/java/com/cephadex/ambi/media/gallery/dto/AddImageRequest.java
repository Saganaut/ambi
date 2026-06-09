package com.cephadex.ambi.media.gallery.dto;

import com.cephadex.ambi.common.validation.ValidationConstants;
import com.cephadex.ambi.media.AppImage;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Add an image to a gallery by reference (EDIT capability). The caller supplies
 * an already-formed {@link AppImage} — an external URL, or a {@code srcKey} for
 * bytes already in storage. Raw-byte ingestion lives on the separate multipart
 * {@code POST /{id}/images/upload} route, leaving this body-based route purely
 * for references.
 *
 * @param image the image reference to store
 * @param name  an optional human label for the gallery item
 */
public record AddImageRequest(
        @NotNull @Valid AppImage image,
        @Size(max = ValidationConstants.NAME_MAX) String name) {
}
