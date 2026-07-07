package com.cephadex.ambi.session.event.dto;

import com.cephadex.ambi.presentation.slide.content.QAndAContent;

/**
 * The participant-safe slice of a Q&amp;A slide's content carried on
 * {@link SlideView} (the way MCQ carries its options): the per-participant
 * question cap so the client can stop offering the input at the limit, and the
 * moderation flag so it can set expectations about when questions appear.
 * Nothing here is secret — Q&amp;A content has no answer key.
 */
public record QAndAConfigView(
        Integer maxResponses,
        boolean moderated) {

    public static QAndAConfigView from(QAndAContent content) {
        return new QAndAConfigView(content.maxResponses(), content.moderated());
    }
}
