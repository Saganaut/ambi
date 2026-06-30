package com.cephadex.ambi.session.dto;

import jakarta.validation.constraints.NotBlank;

/** Body of {@code POST /api/liveSessions}: the deck to run a live session from. */
public record CreateSessionRequest(@NotBlank String deckId) {
}
