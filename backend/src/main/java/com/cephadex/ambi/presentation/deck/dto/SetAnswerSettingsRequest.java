package com.cephadex.ambi.presentation.deck.dto;

import com.cephadex.ambi.presentation.deck.Settings.AnswerSettings;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/**
 * The answering overrides to attach to a slide, set via the dedicated
 * {@code PUT .../answer-settings} route (EDIT capability). Like a slide's
 * cover/background image, answer settings have a single owner in this endpoint —
 * an {@code updateSlide} never touches them. Clearing the override (so the deck
 * defaults apply at session time) is an explicit {@code DELETE}, never a null
 * PUT, hence {@code answerSettings} is required here.
 *
 * @param answerSettings the per-slide answering override to store
 */
public record SetAnswerSettingsRequest(
        @NotNull @Valid AnswerSettings answerSettings) {
}
