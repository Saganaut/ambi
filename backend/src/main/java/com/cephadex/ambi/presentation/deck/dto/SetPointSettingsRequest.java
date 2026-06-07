package com.cephadex.ambi.presentation.deck.dto;

import com.cephadex.ambi.presentation.deck.Settings.PointSettings;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/**
 * The scoring overrides to attach to a slide, set via the dedicated
 * {@code PUT .../point-settings} route (EDIT capability). Like a slide's
 * cover/background image, point settings have a single owner in this endpoint —
 * an {@code updateSlide} never touches them. Clearing the override (so the deck
 * defaults apply at session time) is an explicit {@code DELETE}, never a null
 * PUT, hence {@code pointSettings} is required here.
 *
 * @param pointSettings the per-slide scoring override to store
 */
public record SetPointSettingsRequest(
        @NotNull @Valid PointSettings pointSettings) {
}
