package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * Open audience prompt. Non-scorable on its own; a FOLLOW_UP child slide
 * ({@code Slide.childId}) can turn the collected answers into a scorable round.
 *
 * <p>Runtime answer: each player submits free-text questions one at a time
 * ({@code QAndAAnswer}), accumulated server-side into their per-round
 * {@code QAndAQuestions} aggregate. The host can type an answer next to any
 * question live ({@code QAndAHostAnswerStore}) and the list fans out as
 * {@code QAndAUpdated}.
 *
 * @param maxResponses   per-player cap on accepted questions; {@code null} = unlimited
 * @param moderated      when {@code true} the host approves questions before they
 *                       appear (authoring flag — runtime moderation is not built yet)
 */
public record QAndAContent(
        Integer maxResponses,
        boolean moderated
) implements NonScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.Q_AND_A;
    }
}
