package com.cephadex.ambi.presentation.deck.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.*;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The wire view of a single {@link Slide}. Slides have no permissions of their
 * own — access is gated by the owning deck — so this is a plain projection of
 * the embedded document.
 */
public record SlideResponse(
        @Schema(requiredMode = REQUIRED) String id,
        @Schema(requiredMode = REQUIRED) String title,
        String section,
        AppImage backgroundImage,
        AppImage coverImage,
        @Schema(requiredMode = REQUIRED) String createdByUserId,
        @Schema(requiredMode = REQUIRED) String lastEditedByUserId,
        String parentId,
        String childId,
        Integer version,
        String sortOrder,
        @Schema(requiredMode = REQUIRED) SlideContent content,
        Difficulty difficulty,
        String explanation,
        String speakerNotes,
        String participantInstructions,
        Settings.SlideSettings settings

) {

    /** Projects an embedded {@link Slide} onto its response. */
    public static SlideResponse from(Slide slide) {
        return new SlideResponse(
                slide.getId(),
                slide.getTitle(),
                slide.getSection(),
                slide.getBackgroundImage(),
                slide.getCoverImage(),
                slide.getCreatedByUserId(),
                slide.getLastEditedByUserId(),
                slide.getParentId(),
                slide.getChildId(),
                slide.getVersion(),
                slide.getSortOrder(),
                slide.getContent(),
                slide.getDifficulty(),
                slide.getExplanation(),
                slide.getSpeakerNotes(),
                slide.getParticipantInstructions(),
                slide.getSettings());
    }
}
