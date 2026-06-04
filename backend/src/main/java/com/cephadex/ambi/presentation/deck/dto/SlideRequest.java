package com.cephadex.ambi.presentation.deck.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.*;

import java.util.Map;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

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
 */
public record SlideRequest(
        @Schema(requiredMode = REQUIRED) String id,
        String title,
        Map<String, Object> styledTitle,
        String section,
        @Schema(requiredMode = REQUIRED) SlideType slideType,
        AppImage backgroundImage,
        AppImage coverImage,
        String parentId,
        String childId,
        String sortOrder,
        @Schema(requiredMode = REQUIRED) SlideContent content) {

    /** Maps this request onto a fresh {@link Slide} for the service to persist. */
    public Slide toSlide() {
        Slide slide = new Slide();
        slide.setId(id);
        slide.setTitle(title);
        slide.setStyledTitle(styledTitle);
        slide.setSection(section);
        slide.setSlideType(slideType);
        slide.setBackgroundImage(backgroundImage);
        slide.setCoverImage(coverImage);
        slide.setParentId(parentId);
        slide.setChildId(childId);
        slide.setSortOrder(sortOrder);
        slide.setContent(content);
        return slide;
    }
}
