package com.cephadex.ambi.session.event.dto;

import java.util.List;
import java.util.function.Function;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.AxisContent;
import com.cephadex.ambi.presentation.slide.content.DrawingContent;
import com.cephadex.ambi.presentation.slide.content.GridContent;
import com.cephadex.ambi.presentation.slide.content.MatchingContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.NumberContent;
import com.cephadex.ambi.presentation.slide.content.QAndAContent;
import com.cephadex.ambi.presentation.slide.content.ScalesContent;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.content.TextContent;
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
 * matrix + items, never {@code correctCells}); an Axis slide carries
 * {@link AxisConfigView} (the endpoint labels + items, never
 * {@code correctPositions} or {@code tolerance}); a Scales slide carries
 * {@link ScalesConfigView} (the endpoints, anchor labels + statements, never
 * {@code correctValues} or {@code tolerance}); a Matching slide carries
 * {@link MatchingConfigView} (both card columns with the right column
 * re-ordered, never {@code correctPairs}); a Drawing slide carries
 * {@link DrawingConfigView} (prompt image + placement, palette, tools, never
 * {@code correctImage}); a Text slide carries {@link TextConfigView} (the input
 * cap + a word-cloud display hint, never {@code acceptedAnswers} or the
 * match/normalization settings); a Number slide carries {@link NumberConfigView}
 * (the display bounds + unit suffix, never {@code answer}, {@code scoreMode}, or
 * {@code tolerance}); each is {@code null} for every other kind.
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
        AxisConfigView axis,
        ScalesConfigView scales,
        MatchingConfigView matching,
        DrawingConfigView drawing,
        TextConfigView text,
        NumberConfigView number,
        AnswerSettingsView answerSettings) {

    /**
     * Builds the participant-safe view of {@code slide}, dropping every secret.
     * {@code effectiveAnswer} is the slide's resolved answer settings (deck default
     * merged with any per-slide override, via
     * {@link Settings#effectiveAnswerSettings}); may be {@code null}.
     * {@code imageUrl} resolves an item's {@link AppImage} to a renderable URL
     * (see {@link MatchingConfigView} for why images travel pre-resolved).
     */
    public static SlideView from(Slide slide, Settings.AnswerSettings effectiveAnswer,
            Function<AppImage, String> imageUrl) {
        SlideContent content = slide.getContent();
        List<McqOptionView> options = null;
        QAndAConfigView qAndA = null;
        GridConfigView grid = null;
        AxisConfigView axis = null;
        ScalesConfigView scales = null;
        MatchingConfigView matching = null;
        DrawingConfigView drawing = null;
        TextConfigView text = null;
        NumberConfigView number = null;
        SlideType contentType = null;
        if (content != null) {
            contentType = content.contentType();
            if (content instanceof McqContent mcq) {
                options = mcq.options().stream().map((var option) -> McqOptionView.from(option, imageUrl)).toList();
            }
            if (content instanceof QAndAContent qanda) {
                qAndA = QAndAConfigView.from(qanda);
            }
            if (content instanceof GridContent gridContent) {
                grid = GridConfigView.from(gridContent, imageUrl);
            }
            if (content instanceof AxisContent axisContent) {
                axis = AxisConfigView.from(axisContent);
            }
            if (content instanceof ScalesContent scalesContent) {
                scales = ScalesConfigView.from(scalesContent);
            }
            if (content instanceof MatchingContent matchingContent) {
                matching = MatchingConfigView.from(matchingContent, imageUrl);
            }
            if (content instanceof DrawingContent drawingContent) {
                drawing = DrawingConfigView.from(drawingContent, imageUrl);
            }
            if (content instanceof TextContent textContent) {
                text = TextConfigView.from(textContent);
            }
            if (content instanceof NumberContent numberContent) {
                number = NumberConfigView.from(numberContent);
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
                axis,
                scales,
                matching,
                drawing,
                text,
                number,
                AnswerSettingsView.from(effectiveAnswer));
    }
}
