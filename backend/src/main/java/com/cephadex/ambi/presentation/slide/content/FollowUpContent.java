package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/*
 * Proposed shape (+ ScorableContent base) — a question chained off a parent
 * slide via Slide.parentId/childId; revealed only after the parent resolves.
 *   Set<String>  triggerOnOptionIds;  // show only if parent answered thus (null = always)
 *   SlideContent question;            // the nested question body to ask
 * Essentially a typed wrapper that re-uses another content shape.
 */
public record FollowUpContent(
        int pointValue,
        Difficulty difficulty,
        String explanation) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.FOLLOW_UP;
    }
}
