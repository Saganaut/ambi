package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * Open audience prompt. Non-scorable ({@link NonScorableContent}), so it can't
 * be a FOLLOW_UP parent — {@code FollowUpMode.modesFor(Q_AND_A)} is empty and
 * {@code DeckService} rejects any attempt to attach a follow-up to one.
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
