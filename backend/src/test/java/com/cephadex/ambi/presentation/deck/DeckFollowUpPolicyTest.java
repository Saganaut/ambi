package com.cephadex.ambi.presentation.deck;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.DrawingContent;
import com.cephadex.ambi.presentation.slide.content.FollowUpContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.TextContent;
import com.cephadex.ambi.presentation.slide.content.TitleContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes;
import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;
import com.cephadex.ambi.presentation.slide.enums.PromptPlacement;

/** Covers parent eligibility, answer-key requirements, and safe follow-up content transitions. */
class DeckFollowUpPolicyTest {

    @Test
    void attachRejectsNonScorableParent() {
        Deck deck = deckWithParent(new TitleContent(null));

        assertThatThrownBy(() -> DeckFollowUpPolicy.requireCanAttach(
                deck, deck.findSlide("parent").orElseThrow(), FollowUpMode.PREDICT_POPULAR))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("scorable");
    }

    @Test
    void attachRejectsModeUnsupportedByParentType() {
        Deck deck = deckWithParent(textContent());

        assertThatThrownBy(() -> DeckFollowUpPolicy.requireCanAttach(
                deck, deck.findSlide("parent").orElseThrow(), FollowUpMode.PREDICT_POPULAR))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("not valid");
    }

    @Test
    void attachRejectsFollowUpParent() {
        Deck deck = deckWithPair(mcqContent(), FollowUpMode.PREDICT_POPULAR);

        assertThatThrownBy(() -> DeckFollowUpPolicy.requireCanAttach(
                deck, deck.findSlide("follow-up").orElseThrow(), FollowUpMode.PREDICT_POPULAR))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("cannot have its own follow-up");
    }

    @Test
    void keyedModeRejectsTextParentWithoutAuthoredAnswer() {
        Deck deck = deckWithParent(textContent());

        assertThatThrownBy(() -> DeckFollowUpPolicy.requireCanAttach(
                deck, deck.findSlide("parent").orElseThrow(), FollowUpMode.SPOT_THE_ANSWER))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("authored answer");
    }

    @Test
    void keyedModeAcceptsTextParentWithAuthoredAnswer() {
        Deck deck = deckWithParent(keyedTextContent("Paris"));

        assertThatCode(() -> DeckFollowUpPolicy.requireCanAttach(
                deck, deck.findSlide("parent").orElseThrow(), FollowUpMode.SPOT_THE_ANSWER))
                .doesNotThrowAnyException();
    }

    @Test
    void keyedModeRejectsUnsupportedScorableParent() {
        Deck deck = deckWithParent(mcqContent());

        assertThatThrownBy(() -> DeckFollowUpPolicy.requireCanAttach(
                deck, deck.findSlide("parent").orElseThrow(), FollowUpMode.SPOT_THE_ANSWER))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("not valid");
    }

    @Test
    void keyedModeAcceptsStoredDrawingAnswer() {
        Deck deck = deckWithParent(drawingContent(storedImage("drawing/key")));

        assertThatCode(() -> DeckFollowUpPolicy.requireCanAttach(
                deck, deck.findSlide("parent").orElseThrow(), FollowUpMode.SPOT_THE_ANSWER))
                .doesNotThrowAnyException();
    }

    @Test
    void keyedModeAcceptsStoredDrawingAnswerWithoutVariants() {
        AppImage image = storedImage("drawing/key");
        image.setVariants(Map.of());
        Deck deck = deckWithParent(drawingContent(image));

        assertThatCode(() -> DeckFollowUpPolicy.requireCanAttach(
                deck, deck.findSlide("parent").orElseThrow(), FollowUpMode.SPOT_THE_ANSWER))
                .doesNotThrowAnyException();
    }

    @Test
    void keyedModeRejectsDrawingParentWithoutAnswerImage() {
        Deck deck = deckWithParent(drawingContent(null));

        assertThatThrownBy(() -> DeckFollowUpPolicy.requireCanAttach(
                deck, deck.findSlide("parent").orElseThrow(), FollowUpMode.SPOT_THE_ANSWER))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("authored answer");
    }

    @Test
    void keyedModeRejectsExternalDrawingAnswer() {
        Deck deck = deckWithParent(drawingContent(externalImage("https://example.com/key.png")));

        assertThatThrownBy(() -> DeckFollowUpPolicy.requireCanAttach(
                deck, deck.findSlide("parent").orElseThrow(), FollowUpMode.SPOT_THE_ANSWER))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("authored answer");
    }

    @Test
    void regularSlideRejectsTransitionIntoFollowUp() {
        Deck deck = deckWithParent(mcqContent());

        assertThatThrownBy(() -> DeckFollowUpPolicy.requireValidContentTransition(
                deck, deck.findSlide("parent").orElseThrow(),
                new FollowUpContent(FollowUpMode.PREDICT_POPULAR)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("follow-up endpoint");
    }

    @Test
    void followUpRejectsTransitionIntoRegularContent() {
        Deck deck = deckWithPair(mcqContent(), FollowUpMode.PREDICT_POPULAR);

        assertThatThrownBy(() -> DeckFollowUpPolicy.requireValidContentTransition(
                deck, deck.findSlide("follow-up").orElseThrow(), new TitleContent(null)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("cannot change");
    }

    @Test
    void parentRejectsTransitionThatInvalidatesChildMode() {
        Deck deck = deckWithPair(mcqContent(), FollowUpMode.PREDICT_POPULAR);

        assertThatThrownBy(() -> DeckFollowUpPolicy.requireValidContentTransition(
                deck, deck.findSlide("parent").orElseThrow(), new TitleContent(null)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("invalidate its follow-up");
    }

    @Test
    void keyedChildRejectsRemovalOfParentAnswer() {
        Deck deck = deckWithPair(keyedTextContent("answer"), FollowUpMode.SPOT_THE_ANSWER);

        assertThatThrownBy(() -> DeckFollowUpPolicy.requireValidContentTransition(
                deck, deck.findSlide("parent").orElseThrow(), textContent()))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Removing this slide's authored answer");
    }

    @Test
    void keyedTextParentRejectsModeChangeWhenAnswerIsMissing() {
        Deck deck = deckWithPair(textContent(), FollowUpMode.BEST_ANSWER_VOTE);

        assertThatThrownBy(() -> DeckFollowUpPolicy.requireValidContentTransition(
                deck, deck.findSlide("follow-up").orElseThrow(),
                new FollowUpContent(FollowUpMode.SPOT_THE_ANSWER)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("authored answer");
    }

    @Test
    void keyedDrawingParentRejectsModeChangeWhenAnswerIsMissing() {
        Deck deck = deckWithPair(drawingContent(null), FollowUpMode.BEST_ANSWER_VOTE);

        assertThatThrownBy(() -> DeckFollowUpPolicy.requireValidContentTransition(
                deck, deck.findSlide("follow-up").orElseThrow(),
                new FollowUpContent(FollowUpMode.SPOT_THE_ANSWER)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("authored answer");
    }

    @Test
    void keyedDrawingChildRejectsRemovalOfParentAnswer() {
        Deck deck = deckWithPair(drawingContent(storedImage("drawing/key")), FollowUpMode.SPOT_THE_ANSWER);

        assertThatThrownBy(() -> DeckFollowUpPolicy.requireValidContentTransition(
                deck, deck.findSlide("parent").orElseThrow(), drawingContent(null)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Removing this slide's authored answer");
    }

    @Test
    void keyedDrawingChildAcceptsReplacementParentAnswer() {
        Deck deck = deckWithPair(drawingContent(storedImage("drawing/key")), FollowUpMode.SPOT_THE_ANSWER);

        assertThatCode(() -> DeckFollowUpPolicy.requireValidContentTransition(
                deck, deck.findSlide("parent").orElseThrow(), drawingContent(storedImage("drawing/replacement"))))
                .doesNotThrowAnyException();
    }

    @Test
    void followUpAcceptsModeChangeSupportedByParent() {
        Deck deck = deckWithPair(mcqContent(), FollowUpMode.PREDICT_POPULAR);

        assertThatCode(() -> DeckFollowUpPolicy.requireValidContentTransition(
                deck, deck.findSlide("follow-up").orElseThrow(),
                new FollowUpContent(FollowUpMode.BEST_ANSWER_VOTE)))
                .doesNotThrowAnyException();
    }

    private static Deck deckWithParent(com.cephadex.ambi.presentation.slide.content.SlideContent content) {
        Deck deck = new Deck();
        deck.setSlides(new ArrayList<>());
        Slide parent = slide("parent", content);
        deck.getSlides().add(parent);
        return deck;
    }

    private static Deck deckWithPair(
            com.cephadex.ambi.presentation.slide.content.SlideContent parentContent,
            FollowUpMode mode) {
        Deck deck = deckWithParent(parentContent);
        Slide parent = deck.findSlide("parent").orElseThrow();
        Slide followUp = slide("follow-up", new FollowUpContent(mode));
        parent.setChildId(followUp.getId());
        followUp.setParentId(parent.getId());
        deck.getSlides().add(followUp);
        return deck;
    }

    private static Slide slide(String id, com.cephadex.ambi.presentation.slide.content.SlideContent content) {
        Slide slide = new Slide();
        slide.setId(id);
        slide.setContent(content);
        return slide;
    }

    private static McqContent mcqContent() {
        return new McqContent(List.of(), Set.of(), SlideContentTypes.McqDataVisualization.NONE);
    }

    private static TextContent textContent() {
        return new TextContent(Set.of(), SlideContentTypes.MatchMode.EXACT, false, true, null);
    }

    private static TextContent keyedTextContent(String... answers) {
        return new TextContent(new LinkedHashSet<>(List.of(answers)),
                SlideContentTypes.MatchMode.EXACT, false, true, null);
    }

    private static DrawingContent drawingContent(AppImage image) {
        return new DrawingContent(null, PromptPlacement.ALONGSIDE, image, List.of(), Set.of());
    }

    private static AppImage storedImage(String key) {
        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey(key);
        image.setVariants(Map.of(ImageSizeOptions.LG, key));
        return image;
    }

    private static AppImage externalImage(String source) {
        AppImage image = new AppImage();
        image.setExternal(true);
        image.setExternalSrc(source);
        return image;
    }
}
