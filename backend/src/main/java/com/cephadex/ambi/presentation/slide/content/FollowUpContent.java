package com.cephadex.ambi.presentation.slide.content;

import java.util.Set;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.SubmissionOption;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * Follow-up question chained off a parent slide via {@code Slide.parentId/childId}.
 * Revealed only after the parent round resolves.
 *
 * @param prompt             the question text shown to players
 * @param submissionOption   reference to the parent slide's submission shown as context
 * @param triggerOnOptionIds show this slide only when the parent answer matches one of these
 *                           option ids; {@code null} or empty = always show
 */
public record FollowUpContent(
        int pointValue,
        Difficulty difficulty,
        String explanation,
        String prompt,
        SubmissionOption submissionOption,
        Set<String> triggerOnOptionIds
) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.FOLLOW_UP;
    }
}
