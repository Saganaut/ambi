package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.SubmissionOption;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * Follow-up question chained off a parent slide via
 * {@code Slide.parentId/childId}.
 * Revealed only after the parent round resolves.
 *
 * @param parentSlideId    the parent slide this follow-up is chained off
 * @param submissionOption reference to the parent slide's submission shown as
 *                         context
 *
 */
public record FollowUpContent(
        @Schema(requiredMode = REQUIRED) String parentSlideId,
        @Schema(requiredMode = REQUIRED) SubmissionOption submissionOption) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.FOLLOW_UP;
    }
}
