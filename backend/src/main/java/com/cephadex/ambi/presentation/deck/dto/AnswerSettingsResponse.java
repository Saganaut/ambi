package com.cephadex.ambi.presentation.deck.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.cephadex.ambi.presentation.deck.Settings.AnswerSettings;
import com.cephadex.ambi.presentation.deck.Settings.SlideSettings;
import com.cephadex.ambi.presentation.slide.Slide;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The wire view of a slide's answering override. {@code answerSettings} is null
 * when the slide has no override and the deck defaults apply at session time;
 * the {@code slideId} is always echoed so the client can key the result.
 */
public record AnswerSettingsResponse(
        @Schema(requiredMode = REQUIRED) String slideId,
        AnswerSettings answerSettings) {

    /** Projects a slide's answer settings (possibly absent) onto its response. */
    public static AnswerSettingsResponse from(Slide slide) {
        SlideSettings settings = slide.getSettings();
        return new AnswerSettingsResponse(
                slide.getId(),
                settings == null ? null : settings.answerSettings());
    }
}
