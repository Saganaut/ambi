package com.cephadex.ambi.media.gallery.dto;

import com.cephadex.ambi.media.AppImage;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Add an image to a gallery (EDIT capability). For now the caller supplies an
 * already-formed {@link AppImage} — an external URL today, a pre-uploaded
 * {@code srcKey} once the upload pipeline lands. That pipeline will add a
 * multipart {@code POST} on the same path that ingests bytes and populates the
 * {@code AppImage} server-side, leaving this body-based route for references.
 *
 * @param image the image reference to store
 * @param name  an optional human label for the gallery item
 */
public record AddImageRequest(
        @NotNull @Valid AppImage image,
        @Size(max = 200) String name) {
}
