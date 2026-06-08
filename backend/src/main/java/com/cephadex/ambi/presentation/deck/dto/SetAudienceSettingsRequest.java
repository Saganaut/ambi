package com.cephadex.ambi.presentation.deck.dto;

import com.cephadex.ambi.presentation.deck.Settings.AudienceSettings;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/**
 * The audience (who-can-join + engagement) settings to attach to a deck, set via
 * the dedicated {@code PUT .../audience-settings} route (EDIT capability).
 *
 * <p>Audience settings are deck-level only (there is no per-slide audience
 * override), and like the deck's point/answer settings they have a single owner
 * in this endpoint — the metadata {@code PATCH} never touches them. The body
 * fully replaces the current audience settings, so {@code audienceSettings} is
 * required.
 *
 * @param audienceSettings the deck-wide audience settings to store
 */
public record SetAudienceSettingsRequest(
        @NotNull @Valid AudienceSettings audienceSettings) {
}
