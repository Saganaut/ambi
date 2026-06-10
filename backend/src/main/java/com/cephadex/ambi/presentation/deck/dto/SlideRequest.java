package com.cephadex.ambi.presentation.deck.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.*;

import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The editable presentation fields of a slide, shared by the add and update
 * endpoints — {@code DeckService} copies exactly this set in both cases. On
 * add,
 * the client may mint the slide {@code id} optimistically (the service mints
 * one
 * only if absent); on update the path {@code slideId} selects the target and
 * the
 * body's {@code id} is ignored. Audit fields ({@code createdByUserId},
 * {@code lastEditedByUserId}) and {@code version} are server-owned and absent.
 * Cover and background images are absent too: they have a single owner in the
 * dedicated {@code .../cover-image} and {@code .../background-image} endpoints,
 * so a slide edit never touches them. Follow-up links ({@code parentId} /
 * {@code childId}) are server-owned as well: minted only by the dedicated
 * {@code .../follow-up} endpoint and cleared on delete.
 */
public record SlideRequest(
        @Schema(requiredMode = REQUIRED) String id,
        @Schema(requiredMode = REQUIRED) String title,
        String section,
        String sortOrder,
        @Schema(requiredMode = REQUIRED) SlideContent content,
        Difficulty difficulty,
        String explanation,
        String speakerNotes,
        String participantInstructions) {

    /** Maps this request onto a fresh {@link Slide} for the service to persist. */
    public Slide toSlide() {
        Slide slide = new Slide();
        slide.setId(id);
        slide.setTitle(title);
        slide.setSection(section);
        slide.setSortOrder(sortOrder);
        slide.setContent(content);
        slide.setDifficulty(difficulty);
        slide.setExplanation(explanation);
        slide.setSpeakerNotes(speakerNotes);
        slide.setParticipantInstructions(participantInstructions);

        return slide;
    }
}
