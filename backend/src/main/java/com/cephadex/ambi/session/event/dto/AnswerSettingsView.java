package com.cephadex.ambi.session.event.dto;

import com.cephadex.ambi.presentation.deck.Settings;

/**
 * The participant-facing subset of a slide's effective {@link Settings.AnswerSettings}:
 * only the fields a client needs to render and drive the answer UI.
 *
 * <p><strong>Host/scoring settings are deliberately dropped.</strong> The
 * server-owned or authoring-only fields — {@code shuffleOptions} (applied
 * server-side), {@code anonymizeAnswers}, {@code allowAnonymous} (auth gating,
 * enforced server-side), and {@code displayResultsMode} (already encoded by the
 * round phase) — never travel. {@code maxSelections} keeps its raw semantics:
 * {@code 1} = single-select, {@code 0} = unlimited, {@code >1} = capped.
 */
public record AnswerSettingsView(
        int maxSelections,
        boolean displayResultsAsPercentage,
        int countdownTime) {

    /**
     * The participant-safe view of the slide's effective answer settings, or
     * {@code null} when no settings are in effect (neither deck default nor slide
     * override present).
     */
    public static AnswerSettingsView from(Settings.AnswerSettings effective) {
        if (effective == null) {
            return null;
        }
        return new AnswerSettingsView(
                effective.maxSelections(),
                effective.displayResultsAsPercentage(),
                effective.countdownTime());
    }
}
