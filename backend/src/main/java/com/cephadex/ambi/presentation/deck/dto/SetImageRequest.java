package com.cephadex.ambi.presentation.deck.dto;

import com.cephadex.ambi.media.AppImage;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/**
 * The image to attach to a deck or slide slot (cover / background), set via the
 * dedicated {@code PUT .../cover-image} and {@code .../background-image} routes
 * (EDIT capability). Clearing a slot is an explicit {@code DELETE}, never a null
 * PUT — hence {@code image} is required here.
 *
 * @param image the image reference to store in the slot
 */
public record SetImageRequest(
        @NotNull @Valid AppImage image) {
}
