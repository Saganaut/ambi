package com.cephadex.ambi.presentation.deck.dto;

import com.cephadex.ambi.common.validation.ValidationConstants;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * The background color to apply to a deck or slide, set via the dedicated
 * {@code PUT .../background-color} routes (EDIT capability). The color
 * counterpart to {@link SetImageRequest}. Clearing a color is an explicit
 * {@code DELETE}, never a null/blank PUT — hence {@code color} is required and
 * must be a 6-digit hex triplet ({@code #RRGGBB}).
 *
 * @param color the hex background color to store ({@code #RRGGBB})
 */
public record SetColorRequest(
        @NotBlank @Pattern(regexp = ValidationConstants.COLOR_HEX_PATTERN) String color) {
}
