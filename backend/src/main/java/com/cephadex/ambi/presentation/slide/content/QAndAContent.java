package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/*
 * Proposed shape — open audience prompt. Non-scorable on its own, but a
 * FOLLOW_UP child (Slide.childId) can turn the collected answers into a
 * scorable round.
 *   boolean allowAnonymous;
 *   Integer maxResponses;  // null = unlimited
 *   boolean moderated;     // host approves before display
 * Runtime answer: free-text String per player.
 */
/**
 * This is not scorable but if a follow up is attached to it the follow up is
 **/
public record QAndAContent() implements NonScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.Q_AND_A;
    }
}
