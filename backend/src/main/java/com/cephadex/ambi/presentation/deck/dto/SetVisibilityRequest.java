package com.cephadex.ambi.presentation.deck.dto;

import com.cephadex.ambi.presentation.deck.enums.DeckVisibility;

import jakarta.validation.constraints.NotNull;

/** The desired visibility for a deck (MANAGE capability). */
public record SetVisibilityRequest(
        @NotNull DeckVisibility visibility) {
}
