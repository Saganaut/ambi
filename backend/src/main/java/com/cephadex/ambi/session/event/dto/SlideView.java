package com.cephadex.ambi.session.event.dto;

import java.util.List;

import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * The participant-facing view of a {@link Slide} sent when a round opens: enough
 * to render the prompt and the answer UI, with every authoring/grading secret
 * stripped.
 *
 * <p><strong>Never carries the answer key.</strong> For an MCQ slide the
 * {@code options} are projected from {@link McqContent#options()} only; the
 * {@code correctOptionIds} set is dropped. Speaker notes, the post-answer
 * explanation, difficulty, and the author/editor ids are likewise omitted. Slide
 * background images and cover images ({@code AppImage}) are deferred with the
 * rest of the presigned-image-over-STOMP work; only the plain background colour
 * travels for now. Content types beyond MCQ carry metadata only ({@code options}
 * is {@code null}) until their participant view is designed.
 */
public record SlideView(
        String id,
        String title,
        String section,
        String participantInstructions,
        String backgroundColor,
        boolean hideBackground,
        SlideType contentType,
        List<McqOptionView> options) {

    /** Builds the participant-safe view of {@code slide}, dropping every secret. */
    public static SlideView from(Slide slide) {
        SlideContent content = slide.getContent();
        List<McqOptionView> options = null;
        SlideType contentType = null;
        if (content != null) {
            contentType = content.contentType();
            if (content instanceof McqContent mcq) {
                options = mcq.options().stream().map(McqOptionView::from).toList();
            }
        }
        return new SlideView(
                slide.getId(),
                slide.getTitle(),
                slide.getSection(),
                slide.getParticipantInstructions(),
                slide.getBackgroundColor(),
                slide.isHideBackground(),
                contentType,
                options);
    }
}
