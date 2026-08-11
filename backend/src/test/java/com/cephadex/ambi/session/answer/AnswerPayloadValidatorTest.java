package com.cephadex.ambi.session.answer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.common.validation.ValidationConstants;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.AllocationContent;
import com.cephadex.ambi.presentation.slide.content.AxisContent;
import com.cephadex.ambi.presentation.slide.content.DrawingContent;
import com.cephadex.ambi.presentation.slide.content.FollowUpContent;
import com.cephadex.ambi.presentation.slide.content.GridContent;
import com.cephadex.ambi.presentation.slide.content.MatchingContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.PlaceOnImageContent;
import com.cephadex.ambi.presentation.slide.content.QAndAContent;
import com.cephadex.ambi.presentation.slide.content.ScalesContent;
import com.cephadex.ambi.presentation.slide.content.TextContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisPoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.GridItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchMode;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqDataVisualization;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlaceItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlacePoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScaleItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;
import com.cephadex.ambi.presentation.slide.enums.PromptPlacement;
import com.cephadex.ambi.presentation.slide.enums.Tool;
import com.cephadex.ambi.session.answer.payload.AllocationAnswer;
import com.cephadex.ambi.session.answer.payload.AxisAnswer;
import com.cephadex.ambi.session.answer.payload.DrawingAnswer;
import com.cephadex.ambi.session.answer.payload.FollowUpAnswer;
import com.cephadex.ambi.session.answer.payload.GridAnswer;
import com.cephadex.ambi.session.answer.payload.MatchingAnswer;
import com.cephadex.ambi.session.answer.payload.McqAnswer;
import com.cephadex.ambi.session.answer.payload.NumberAnswer;
import com.cephadex.ambi.session.answer.payload.PlaceOnImageAnswer;
import com.cephadex.ambi.session.answer.payload.QAndAAnswer;
import com.cephadex.ambi.session.answer.payload.QAndAQuestions;
import com.cephadex.ambi.session.answer.payload.ScalesAnswer;
import com.cephadex.ambi.session.answer.payload.TextAnswer;
import com.cephadex.ambi.session.followUp.FollowUpOption;
import com.cephadex.ambi.session.followUp.FollowUpOptionSet;
import com.cephadex.ambi.session.redis.FollowUpOptionStore;

/** Verifies every authored-content and runtime-board invariant enforced before answer submission. */
class AnswerPayloadValidatorTest {

    private static final String SESSION_ID = "session-1";
    private static final String SLIDE_ID = "slide-1";
    private static final String PARTICIPANT_ID = "participant-1";

    private FollowUpOptionStore followUpOptions;
    private AnswerPayloadValidator validator;

    @BeforeEach
    void setUp() {
        followUpOptions = mock(FollowUpOptionStore.class);
        validator = new AnswerPayloadValidator(followUpOptions);
    }

    @Test
    void payloadTypeMustMatchSlideContent() {
        assertThatThrownBy(() -> validate(mcqContent(), new NumberAnswer(4), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(new QAndAContent(null, false), new QAndAQuestions(List.of()), 1))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void mcqSelectionsMustExistAndRespectTheSelectionLimit() {
        assertThatThrownBy(() -> validate(mcqContent(), new McqAnswer(Set.of()), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(mcqContent(), new McqAnswer(Set.of("missing")), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(mcqContent(), new McqAnswer(Set.of("a", "b")), 1))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void gridPlacementsMustNameItemsAndBoundedCells() {
        assertThatThrownBy(() -> validate(gridContent(), new GridAnswer(Map.of()), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(gridContent(), new GridAnswer(Map.of("missing", "0,0")), 1))
                .isInstanceOf(ValidationException.class);
        for (String cell : List.of("2,0", "0,2", "-1,0", "x,0", "0")) {
            assertThatThrownBy(() -> validate(gridContent(), new GridAnswer(Map.of("item", cell)), 1))
                    .isInstanceOf(ValidationException.class);
        }
    }

    @Test
    void normalizedPlacementKindsRejectUnknownItemsAndInvalidCoordinates() {
        assertThatThrownBy(() -> validate(axisContent(), new AxisAnswer(Map.of()), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(axisContent(), new AxisAnswer(Map.of("missing", new AxisPoint(.5, .5))), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(axisContent(), new AxisAnswer(Map.of("item", new AxisPoint(Double.NaN, .5))), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(placeContent(), new PlaceOnImageAnswer(Map.of()), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(placeContent(), new PlaceOnImageAnswer(Map.of("missing", new PlacePoint(.5, .5))), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(placeContent(), new PlaceOnImageAnswer(Map.of("item", new PlacePoint(1.1, .5))), 1))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void scaleRatingsMustNameStatementsAndStayNormalized() {
        assertThatThrownBy(() -> validate(scalesContent(), new ScalesAnswer(Map.of()), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(scalesContent(), new ScalesAnswer(Map.of("missing", .5)), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(scalesContent(), new ScalesAnswer(Map.of("item", Double.NaN)), 1))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void matchingPairsMustUseEachAuthoredCardAtMostOnce() {
        assertThatThrownBy(() -> validate(matchingContent(), new MatchingAnswer(Map.of()), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(matchingContent(), new MatchingAnswer(Map.of("missing", "right-1")), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(matchingContent(), new MatchingAnswer(
                Map.of("left-1", "right-1", "left-2", "right-1")), 1))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void allocationMustSpendTheWholePoolAcrossEveryAuthoredOption() {
        assertThatThrownBy(() -> validate(allocationContent(), new AllocationAnswer(Map.of()), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(allocationContent(), new AllocationAnswer(Map.of("missing", 10)), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(allocationContent(), new AllocationAnswer(Map.of("a", -1, "b", 11)), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(allocationContent(), new AllocationAnswer(Map.of("a", 10)), 1))
                .isInstanceOf(ValidationException.class).hasMessageContaining("every option");
        assertThatThrownBy(() -> validate(allocationContent(), new AllocationAnswer(Map.of("a", 4, "b", 4)), 1))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void questionsAndTextMustBeNonBlankAndRespectLengthCaps() {
        assertThatThrownBy(() -> validate(new QAndAContent(null, false), new QAndAAnswer(" "), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(new QAndAContent(null, false),
                new QAndAAnswer("x".repeat(ValidationConstants.QANDA_QUESTION_MAX + 1)), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(textContent(5), new TextAnswer(" "), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(textContent(null),
                new TextAnswer("x".repeat(ValidationConstants.TEXT_ANSWER_MAX + 1)), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(textContent(5), new TextAnswer("too long"), 1))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void drawingMustBelongToTheSubmittingParticipantAndSession() {
        assertThatThrownBy(() -> validate(drawingContent(), new DrawingAnswer(null), 1))
                .isInstanceOf(ValidationException.class);
        AppImage external = new AppImage();
        external.setExternal(true);
        assertThatThrownBy(() -> validate(drawingContent(), new DrawingAnswer(external), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(drawingContent(), new DrawingAnswer(image("gallery/key")), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(drawingContent(),
                new DrawingAnswer(image("drawing/other/" + PARTICIPANT_ID + "/key")), 1))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void followUpPickMustExistAndCannotBelongToTheParticipant() {
        when(followUpOptions.load(SESSION_ID, SLIDE_ID)).thenReturn(new FollowUpOptionSet(List.of(
                new FollowUpOption("other", "Other", null, Set.of("other-participant"), false),
                new FollowUpOption("mine", "Mine", null, Set.of(PARTICIPANT_ID), false))));
        assertThatThrownBy(() -> validate(followUpContent(), new FollowUpAnswer(" "), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(followUpContent(), new FollowUpAnswer("missing"), 1))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate(followUpContent(), new FollowUpAnswer("mine"), 1))
                .isInstanceOf(ConflictException.class)
                .satisfies(error -> assertThat(((ConflictException) error).getCode())
                        .isEqualTo("CANNOT_VOTE_FOR_OWN_ANSWER"));
    }

    private void validate(com.cephadex.ambi.presentation.slide.content.SlideContent content,
            com.cephadex.ambi.session.answer.payload.AnswerPayload payload, int maxSelections) {
        Slide slide = new Slide();
        slide.setId(SLIDE_ID);
        slide.setContent(content);
        validator.validate(SESSION_ID, PARTICIPANT_ID, slide, payload, maxSelections);
    }

    private static McqContent mcqContent() {
        return new McqContent(List.of(option("a"), option("b")), Set.of("a"), McqDataVisualization.NONE);
    }

    private static GridContent gridContent() {
        return new GridContent(List.of("A", "B"), List.of("A", "B"),
                List.of(new GridItem("item", "Item", null, null)), Map.of(), ScoreMode.EXACT);
    }

    private static AxisContent axisContent() {
        return new AxisContent("Low", "High", "Low", "High",
                List.of(new AxisItem("item", "Item", null, null)), Map.of(), .1, ScoreMode.INSIDE_RADIUS);
    }

    private static PlaceOnImageContent placeContent() {
        return new PlaceOnImageContent(null, List.of(new PlaceItem("item", "Item", null, null)),
                Map.of(), .1, ScoreMode.INSIDE_RADIUS);
    }

    private static ScalesContent scalesContent() {
        return new ScalesContent(1, 5, "Low", "High",
                List.of(new ScaleItem("item", "Item", null, null)), Map.of(), 1.0);
    }

    private static MatchingContent matchingContent() {
        return new MatchingContent(List.of(new MatchItem("left-1", "One", null, null),
                new MatchItem("left-2", "Two", null, null)), List.of(new MatchItem("right-1", "One", null, null)),
                Map.of(), ScoreMode.EXACT);
    }

    private static AllocationContent allocationContent() {
        return new AllocationContent(List.of(option("a"), option("b")), Map.of("a", 6, "b", 4), 10, 1);
    }

    private static TextContent textContent(Integer maxLength) {
        return new TextContent(Set.of("answer"), MatchMode.EXACT, true, true, maxLength);
    }

    private static DrawingContent drawingContent() {
        return new DrawingContent(null, PromptPlacement.ALONGSIDE, null, List.of("#111111"), Set.of(Tool.PEN));
    }

    private static FollowUpContent followUpContent() {
        return new FollowUpContent(FollowUpMode.BEST_ANSWER_VOTE);
    }

    private static McqOption option(String id) {
        return new McqOption(id, null, id, null, null);
    }

    private static AppImage image(String key) {
        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey(key);
        return image;
    }
}
