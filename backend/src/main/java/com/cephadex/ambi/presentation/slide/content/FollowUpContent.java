package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * Follow-up question chained off a parent slide via
 * {@code Slide.parentId/childId} (the single source of the link — content
 * carries no parent reference). Revealed only after the parent round resolves;
 * its options come from the parent round's submissions at session runtime, so
 * authoring-time content is just the {@code mode}.
 *
 * @param mode what the follow-up asks about the parent's submissions; must be
 *             valid for the parent's content type
 *             ({@link FollowUpMode#supportsParent})
 */
public record FollowUpContent(
        @Schema(requiredMode = REQUIRED) FollowUpMode mode) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.FOLLOW_UP;
    }
}
