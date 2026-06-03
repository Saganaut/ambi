package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * Open audience prompt. Non-scorable on its own; a FOLLOW_UP child slide
 * ({@code Slide.childId}) can turn the collected answers into a scorable round.
 *
 * <p>Runtime answer: free-text {@code String} per player.
 *
 * @param allowAnonymous whether responses are shown without the player's name
 * @param maxResponses   cap on accepted responses; {@code null} = unlimited
 * @param moderated      when {@code true} the host approves answers before they appear
 */
public record QAndAContent(
        boolean allowAnonymous,
        Integer maxResponses,
        boolean moderated
) implements NonScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.Q_AND_A;
    }
}
