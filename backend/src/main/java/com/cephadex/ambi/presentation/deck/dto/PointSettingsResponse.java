package com.cephadex.ambi.presentation.deck.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.cephadex.ambi.presentation.deck.Settings.PointSettings;
import com.cephadex.ambi.presentation.deck.Settings.SlideSettings;
import com.cephadex.ambi.presentation.slide.Slide;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The wire view of a slide's scoring override. {@code pointSettings} is null
 * when the slide has no override and the deck defaults apply at session time;
 * the {@code slideId} is always echoed so the client can key the result.
 */
public record PointSettingsResponse(
        @Schema(requiredMode = REQUIRED) String slideId,
        PointSettings pointSettings) {

    /** Projects a slide's point settings (possibly absent) onto its response. */
    public static PointSettingsResponse from(Slide slide) {
        SlideSettings settings = slide.getSettings();
        return new PointSettingsResponse(
                slide.getId(),
                settings == null ? null : settings.pointSettings());
    }
}
