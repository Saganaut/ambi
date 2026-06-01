package com.cephadex.ambi.presentation.deck.dto;

import java.util.Map;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * The wire view of a single {@link Slide}. Slides have no permissions of their
 * own — access is gated by the owning deck — so this is a plain projection of
 * the embedded document.
 */
public record SlideResponse(
        String id,
        String title,
        Map<String, Object> styledTitle,
        String section,
        SlideType slideType,
        AppImage backgroundImage,
        AppImage coverImage,
        String createdByUserId,
        String lastEditedByUserId,
        String parentId,
        String childId,
        Integer version,
        String sortOrder) {

    /** Projects an embedded {@link Slide} onto its response. */
    public static SlideResponse from(Slide slide) {
        return new SlideResponse(
                slide.getId(),
                slide.getTitle(),
                slide.getStyledTitle(),
                slide.getSection(),
                slide.getSlideType(),
                slide.getBackgroundImage(),
                slide.getCoverImage(),
                slide.getCreatedByUserId(),
                slide.getLastEditedByUserId(),
                slide.getParentId(),
                slide.getChildId(),
                slide.getVersion(),
                slide.getSortOrder());
    }
}
