package com.cephadex.ambi.session.event.dto;

import java.util.List;

import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.GridContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.QAndAContent;
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
 *
 * <p>The participant-safe answer settings ({@link AnswerSettingsView}) travel too,
 * so the client can drive the answer UI (e.g. whether multiple MCQ selections are
 * allowed); {@code answerSettings} is {@code null} when no settings are in effect.
 * A Q&amp;A slide additionally carries its secret-free config slice
 * ({@link QAndAConfigView}); a Grid slide carries {@link GridConfigView} (the
 * matrix + items, never {@code correctCells}); each is {@code null} for every
 * other kind.
 */
public record SlideView(
        String id,
        String title,
        String section,
        String participantInstructions,
        String backgroundColor,
        boolean hideBackground,
        SlideType contentType,
        List<McqOptionView> options,
        QAndAConfigView qAndA,
        GridConfigView grid,
        AnswerSettingsView answerSettings) {

    /**
     * Builds the participant-safe view of {@code slide}, dropping every secret.
     * {@code effectiveAnswer} is the slide's resolved answer settings (deck default
     * merged with any per-slide override, via
     * {@link Settings#effectiveAnswerSettings}); may be {@code null}.
     */
    public static SlideView from(Slide slide, Settings.AnswerSettings effectiveAnswer) {
        SlideContent content = slide.getContent();
        List<McqOptionView> options = null;
        QAndAConfigView qAndA = null;
        GridConfigView grid = null;
        SlideType contentType = null;
        if (content != null) {
            contentType = content.contentType();
            if (content instanceof McqContent mcq) {
                options = mcq.options().stream().map(McqOptionView::from).toList();
            }
            if (content instanceof QAndAContent qanda) {
                qAndA = QAndAConfigView.from(qanda);
            }
            if (content instanceof GridContent gridContent) {
                grid = GridConfigView.from(gridContent);
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
                options,
                qAndA,
                grid,
                AnswerSettingsView.from(effectiveAnswer));
    }
}
