package com.cephadex.ambi.presentation.deck.dto;

import com.cephadex.ambi.presentation.deck.Settings.InviteSettings;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/**
 * The invite-display settings to attach to a deck — whether the room code is
 * additionally shown in the persistent header, and whether the join QR + room
 * code are shown together on the results screen — set via the dedicated
 * {@code PUT .../invite-settings} route (EDIT capability).
 *
 * <p>Invite settings are deck-level only and, like the deck's point/answer/
 * audience settings, have a single owner in this endpoint — the metadata
 * {@code PATCH} never touches them. The body fully replaces the current invite
 * settings, so {@code inviteSettings} is required.
 *
 * @param inviteSettings the deck-wide invite-display settings to store
 */
public record SetInviteSettingsRequest(
        @NotNull @Valid InviteSettings inviteSettings) {
}
