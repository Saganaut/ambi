package com.cephadex.ambi.session.event;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;

import java.util.function.Function;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.deck.Settings.AnswerSettings;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.MatchingContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.ScalesContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqDataVisualization;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScaleItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.enums.McqOptionType;
import com.cephadex.ambi.session.event.dto.ParticipantView;
import com.cephadex.ambi.session.event.dto.ScoreboardEntry;
import com.cephadex.ambi.session.event.dto.SlideView;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.redis.LiveRoundState;
import com.cephadex.ambi.user.Avatar;

/**
 * Guards the wire-safety contract of the event mapper: participant {@code userId}
 * and the slide answer key never reach a built event, and the scoreboard ranks
 * correctly.
 */
class SessionEventsTest {

    private final RedisJsonCodec codec = new RedisJsonCodec();

    /** Stand-in for the presigning resolver — these slides carry no images. */
    private static final Function<AppImage, String> NO_IMAGES = _ -> null;

    private static Slide mcqSlide() {
        Slide slide = new Slide();
        slide.setId("slide-1");
        slide.setTitle("Capital of Gondor?");
        slide.setSpeakerNotes("psst, it's Minas Tirith");
        slide.setExplanation("Minas Tirith is the capital.");
        slide.setContent(new McqContent(
                List.of(
                        new McqOption("opt-a", McqOptionType.TEXT, "Minas Tirith", null, null),
                        new McqOption("opt-b", McqOptionType.TEXT, "Osgiliath", null, null)),
                Set.of("opt-a"),
                McqDataVisualization.BAR_VERTICAL));
        return slide;
    }

    private static Slide scalesSlide() {
        Slide slide = new Slide();
        slide.setId("slide-scales");
        slide.setTitle("Rate these meals");
        slide.setContent(new ScalesContent(
                1, 5, "Skip it", "Sacred",
                List.of(new ScaleItem("meal-1", "Breakfast"), new ScaleItem("meal-2", "Elevenses")),
                Map.of("meal-1", 4.5),
                0.8));
        return slide;
    }

    /**
     * Authored pair order deliberately anti-alphabetical on the right column's
     * ids, so the view's id re-ordering is observable. {@code king-image} carries
     * an image; the rest are phrase cards.
     */
    private static Slide matchingSlide() {
        AppImage image = new AppImage();
        image.setExternal(true);
        image.setExternalSrc("https://example.test/aragorn.png");
        Slide slide = new Slide();
        slide.setId("slide-matching");
        slide.setTitle("Match the ruler to the realm");
        slide.setContent(new MatchingContent(
                List.of(
                        new MatchItem("left-1", "Gondor", null, "#aabbcc"),
                        new MatchItem("left-2", "Rohan", null, null)),
                List.of(
                        new MatchItem("right-z", "King Elessar", image, null),
                        new MatchItem("right-a", "King Éomer", null, null)),
                Map.of("left-1", "right-z", "left-2", "right-a"),
                ScoreMode.EXACT));
        return slide;
    }

    // Participant-relevant fields set to distinctive values; host/scoring fields
    // (shuffleOptions, anonymizeAnswers, allowAnonymous, displayResultsMode) set so
    // the strip assertions are meaningful.
    private static AnswerSettings answerSettings() {
        return new AnswerSettings(ResultsDisplayMode.MANUAL, true, true, true, 30, true, 3);
    }

    @Test
    void slideViewKeepsOptionsButDropsAnswerKeyAndNotes() {
        SlideView view = SlideView.from(mcqSlide(), null, NO_IMAGES);

        assertThat(view.options()).extracting("id").containsExactly("opt-a", "opt-b");
        // No settings in effect → no answer-settings view.
        assertThat(view.answerSettings()).isNull();

        // The answer key, speaker notes, and explanation must not survive into the wire view.
        String json = codec.serialize(view);
        assertThat(json).doesNotContain("correctOptionIds");
        assertThat(json).doesNotContain("psst");
        assertThat(json).doesNotContain("Minas Tirith is the capital");
    }

    @Test
    void slideViewCarriesScalesConfigButDropsAnswerKeyAndTolerance() {
        SlideView view = SlideView.from(scalesSlide(), null, NO_IMAGES);

        // The participant-safe config travels: endpoints, anchor labels, statements.
        assertThat(view.scales()).isNotNull();
        assertThat(view.scales().min()).isEqualTo(1);
        assertThat(view.scales().max()).isEqualTo(5);
        assertThat(view.scales().leftLabel()).isEqualTo("Skip it");
        assertThat(view.scales().items()).extracting("id").containsExactly("meal-1", "meal-2");

        // correctValues (the answer key) and tolerance are grading-only — never on the wire.
        String json = codec.serialize(view);
        assertThat(json).doesNotContain("correctValues");
        assertThat(json).doesNotContain("tolerance");
        assertThat(json).doesNotContain("4.5");
    }

    @Test
    void slideViewCarriesParticipantSafeAnswerSettings() {
        SlideView view = SlideView.from(mcqSlide(), answerSettings(), NO_IMAGES);

        assertThat(view.answerSettings()).isNotNull();
        assertThat(view.answerSettings().maxSelections()).isEqualTo(3);
        assertThat(view.answerSettings().displayResultsAsPercentage()).isTrue();
        assertThat(view.answerSettings().countdownTime()).isEqualTo(30);

        // Host/scoring/server-enforced settings must never reach the participant view.
        String json = codec.serialize(view);
        assertThat(json).contains("maxSelections");
        assertThat(json).doesNotContain("shuffleOptions");
        assertThat(json).doesNotContain("anonymizeAnswers");
        assertThat(json).doesNotContain("allowAnonymous");
        assertThat(json).doesNotContain("displayResultsMode");
    }

    @Test
    void roundStartedEventCarriesNoAnswerKey() {
        LiveRoundState state = new LiveRoundState("pub-1", RoundPhase.SUBMIT, "slide-1", Instant.now());

        String json = codec.serialize(SessionEvents.roundStarted(state, mcqSlide(), answerSettings(), NO_IMAGES));

        assertThat(json).contains("RoundStarted").contains("opt-a").contains("maxSelections");
        assertThat(json).doesNotContain("correctOptionIds");
    }

    @Test
    void liveResultsShownCarriesSlideAndCountsButNoAnswerKey() {
        LiveRoundState state = new LiveRoundState("pub-1", RoundPhase.SUBMIT_LIVE, "slide-1", Instant.now());

        String json = codec.serialize(
                SessionEvents.liveResultsShown(state, mcqSlide(), Map.of("opt-a", 3), answerSettings(), NO_IMAGES));

        assertThat(json).contains("LiveResultsShown").contains("opt-a");
        assertThat(json).doesNotContain("correctOptionIds");
    }

    @Test
    void slideViewCarriesMatchingConfigButDropsAnswerKey() {
        SlideView view = SlideView.from(matchingSlide(), null,
                img -> img == null ? null : "https://cdn.test/presigned/aragorn");

        // Both columns travel; the left column keeps its authored order.
        assertThat(view.matching()).isNotNull();
        assertThat(view.matching().left()).extracting("id").containsExactly("left-1", "left-2");
        assertThat(view.matching().left()).extracting("color").containsExactly("#aabbcc", null);
        // The right column is re-ordered by id, so the authored parallel-array
        // zip (the answer key's positional form) cannot be reconstructed.
        assertThat(view.matching().right()).extracting("id").containsExactly("right-a", "right-z");
        // Images arrive pre-resolved through the supplied resolver; phrase cards carry none.
        assertThat(view.matching().right()).extracting("imageUrl")
                .containsExactly(null, "https://cdn.test/presigned/aragorn");
        // An authored key marks the round as scored — without disclosing the key.
        assertThat(view.matching().scored()).isTrue();

        String json = codec.serialize(view);
        assertThat(json).doesNotContain("correctPairs");
    }

    @Test
    void matchingViewMarksCollectOnlyWhenNoKeyAuthored() {
        Slide slide = matchingSlide();
        MatchingContent content = (MatchingContent) slide.getContent();
        slide.setContent(new MatchingContent(content.left(), content.right(), Map.of(), content.scoreMode()));

        SlideView view = SlideView.from(slide, null, NO_IMAGES);

        assertThat(view.matching().scored()).isFalse();
    }

    @Test
    void submissionsLockedCarriesNoCounts() {
        // A hidden lock must not ship the distribution: the record has no counts field.
        String json = codec.serialize(SessionEvents.submissionsLocked("slide-1"));

        assertThat(json).contains("SubmissionsLocked").contains("slide-1");
        assertThat(json).doesNotContain("optionCounts");
    }

    @Test
    void participantViewStripsUserId() {
        Participant p = Participant.join("user-secret-123", "Frodo", new Avatar(), "blue");

        ParticipantView view = ParticipantView.from(p);
        assertThat(view.participantId()).isEqualTo(p.getParticipantId());

        String json = codec.serialize(view);
        assertThat(json).doesNotContain("user-secret-123");
        assertThat(json).contains("Frodo");
    }

    @Test
    void scoreboardSortsByPointsDescendingWithRanks() {
        Participant low = Participant.join("u1", "Sam", null, null);
        Participant high = Participant.join("u2", "Frodo", null, null);
        low.getScore().recordCorrectAnswer(10);
        high.getScore().recordCorrectAnswer(50);

        List<ScoreboardEntry> board = SessionEvents.scoreboard(List.of(low, high));

        assertThat(board).extracting(e -> e.displayName()).containsExactly("Frodo", "Sam");
        assertThat(board).extracting(e -> e.rank()).containsExactly(1, 2);
        assertThat(board.get(0).points()).isEqualTo(50);
    }
}
