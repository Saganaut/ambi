package com.cephadex.ambi.session.event;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
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
import com.cephadex.ambi.presentation.slide.content.FollowUpContent;
import com.cephadex.ambi.presentation.slide.content.MatchingContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.NumberContent;
import com.cephadex.ambi.presentation.slide.content.RankingContent;
import com.cephadex.ambi.presentation.slide.content.ScalesContent;
import com.cephadex.ambi.presentation.slide.content.TextContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchMode;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqDataVisualization;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.RankItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScaleItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;
import com.cephadex.ambi.presentation.slide.enums.McqOptionType;
import com.cephadex.ambi.session.event.dto.FollowUpConfigView;
import com.cephadex.ambi.session.event.dto.ParticipantView;
import com.cephadex.ambi.session.event.dto.ScoreboardEntry;
import com.cephadex.ambi.session.event.dto.SlideView;
import com.cephadex.ambi.session.event.dto.VoteOptionView;
import com.cephadex.ambi.session.followUp.FollowUpOption;
import com.cephadex.ambi.session.followUp.FollowUpOptionSet;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.redis.LiveRoundState;
import com.cephadex.ambi.session.redis.VoteOption;
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
                List.of(new ScaleItem("meal-1", "Breakfast", null),
                        new ScaleItem("meal-2", "Elevenses", null)),
                Map.of("meal-1", 4.5),
                0.8));
        return slide;
    }

    private static Slide numberSlide() {
        Slide slide = new Slide();
        slide.setId("slide-number");
        slide.setTitle("How far to the summit?");
        slide.setContent(new NumberContent(
                new BigDecimal("42.5"), ScoreMode.EXACT, new BigDecimal("2.5"), "km",
                new BigDecimal("0"), new BigDecimal("100")));
        return slide;
    }

    private static Slide textSlide() {
        Slide slide = new Slide();
        slide.setId("slide-text");
        slide.setTitle("Name the capital");
        slide.setContent(new TextContent(
                Set.of("Minas Tirith"), MatchMode.EXACT, true, true, 80));
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

    /**
     * {@code king-image} carries an image; the rest are text-only items. The
     * authored {@code correctOrder} deliberately differs from the item order so
     * the config view's silence about it is observable.
     */
    private static Slide rankingSlide() {
        AppImage image = new AppImage();
        image.setExternal(true);
        image.setExternalSrc("https://example.test/aragorn.png");
        Slide slide = new Slide();
        slide.setId("slide-ranking");
        slide.setTitle("Rank the kings by reign");
        slide.setContent(new RankingContent(
                List.of(
                        new RankItem("rank-1", "Elessar", image, "#aabbcc"),
                        new RankItem("rank-2", "Éomer", null, null),
                        new RankItem("rank-3", "Théoden", null, null)),
                List.of("rank-3", "rank-1", "rank-2"),
                ScoreMode.EXACT));
        return slide;
    }

    /** The follow-up chained off {@link #mcqSlide()} — its board is runtime state, not content. */
    private static Slide followUpSlide() {
        Slide slide = new Slide();
        slide.setId("slide-followup");
        slide.setTitle("Which answer was best?");
        slide.setParentId("slide-1");
        slide.setContent(new FollowUpContent(FollowUpMode.BEST_ANSWER_VOTE));
        return slide;
    }

    /** Two candidates in board order, each carrying the (server-only) author it was minted from. */
    private static FollowUpOptionSet followUpCandidates() {
        return new FollowUpOptionSet(List.of(
                new FollowUpOption("cand-1", "Minas Tirith", null, Set.of("player-writer-2"), false),
                new FollowUpOption("cand-2", "Osgiliath", null, Set.of("player-writer-3"), false)));
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
    void slideViewProjectsOptionImageAsPreResolvedUrl() {
        AppImage image = new AppImage();
        image.setExternal(true);
        image.setExternalSrc("https://example.test/gondor.png");
        Slide slide = new Slide();
        slide.setId("slide-img");
        slide.setContent(new McqContent(
                List.of(
                        new McqOption("opt-img", McqOptionType.IMAGE, null, image, null),
                        new McqOption("opt-text", McqOptionType.TEXT, "Osgiliath", null, null)),
                Set.of("opt-img"),
                McqDataVisualization.BAR_VERTICAL));

        SlideView view = SlideView.from(slide, null, img -> img == image ? "https://s3/presigned" : null);

        assertThat(view.options()).extracting("imageUrl")
                .containsExactly("https://s3/presigned", null);
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
    void slideViewCarriesNumberConfigButDropsAnswerKeyAndGradingSecrets() {
        SlideView view = SlideView.from(numberSlide(), null, NO_IMAGES);

        // The participant-safe config travels: the display bounds and unit suffix.
        assertThat(view.number()).isNotNull();
        assertThat(view.number().min()).isEqualTo(0);
        assertThat(view.number().max()).isEqualTo(100);
        assertThat(view.number().unit()).isEqualTo("km");

        // answer (the key), scoreMode, and tolerance are grading-only — never on the wire.
        String json = codec.serialize(view);
        assertThat(json).doesNotContain("42.5");
        assertThat(json).doesNotContain("scoreMode");
        assertThat(json).doesNotContain("tolerance");
    }

    @Test
    void slideViewCarriesTextConfigButDropsGradingSecrets() {
        SlideView view = SlideView.from(textSlide(), null, NO_IMAGES);

        // The participant-safe config travels: the input cap and the display hint.
        assertThat(view.text()).isNotNull();
        assertThat(view.text().maxLength()).isEqualTo(80);
        // A scored short-answer slide is not a word cloud.
        assertThat(view.text().wordCloud()).isFalse();

        // acceptedAnswers (the answer key) and the match/normalization settings are
        // grading-only — never on the wire.
        String json = codec.serialize(view);
        assertThat(json).doesNotContain("acceptedAnswers");
        assertThat(json).doesNotContain("Minas Tirith");
        assertThat(json).doesNotContain("matchMode");
        assertThat(json).doesNotContain("caseSensitive");
        assertThat(json).doesNotContain("trimWhitespace");
    }

    @Test
    void textViewMarksWordCloudMode() {
        Slide slide = new Slide();
        slide.setId("slide-wordcloud");
        slide.setContent(new TextContent(Set.of(), MatchMode.WORDCLOUD, false, true, null));

        SlideView view = SlideView.from(slide, null, NO_IMAGES);

        // Word-cloud mode flips the board's display hint; an unset cap stays null.
        assertThat(view.text().wordCloud()).isTrue();
        assertThat(view.text().maxLength()).isNull();
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
        LiveRoundState state = new LiveRoundState("pub-1", RoundPhase.SUBMIT, "slide-1", Instant.now(), null, null, 0L, false);

        String json = codec.serialize(
                SessionEvents.roundStarted(state, mcqSlide(), answerSettings(), NO_IMAGES, null, false));

        assertThat(json).contains("RoundStarted").contains("opt-a").contains("maxSelections");
        assertThat(json).doesNotContain("correctOptionIds");
    }

    @Test
    void liveResultsShownCarriesSlideAndCountsButNoAnswerKey() {
        LiveRoundState state = new LiveRoundState("pub-1", RoundPhase.SUBMIT_LIVE, "slide-1", Instant.now(), null, null, 0L, false);

        String json = codec.serialize(SessionEvents.liveResultsShown(
                state, mcqSlide(), Map.of("opt-a", 3), answerSettings(), NO_IMAGES, null, false));

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
    void slideViewCarriesRankingConfigButDropsAnswerKey() {
        SlideView view = SlideView.from(rankingSlide(), null,
                img -> img == null ? null : "https://cdn.test/presigned/aragorn");

        // The item bank travels in authored order (no positional key to leak,
        // unlike Matching — the correct order is a separate field entirely).
        assertThat(view.ranking()).isNotNull();
        assertThat(view.ranking().items()).extracting("id")
                .containsExactly("rank-1", "rank-2", "rank-3");
        assertThat(view.ranking().items()).extracting("label")
                .containsExactly("Elessar", "Éomer", "Théoden");
        assertThat(view.ranking().items()).extracting("color")
                .containsExactly("#aabbcc", null, null);
        // Images arrive pre-resolved through the supplied resolver; text items carry none.
        assertThat(view.ranking().items()).extracting("imageUrl")
                .containsExactly("https://cdn.test/presigned/aragorn", null, null);

        // Neither the answer key nor the score mode reaches the wire.
        String json = codec.serialize(view);
        assertThat(json).doesNotContain("correctOrder");
        assertThat(json).doesNotContain("scoreMode");
        assertThat(json).doesNotContain("rank-3,rank-1,rank-2");
    }

    @Test
    void followUpRoundStartedCarriesTheBoardInOrderButNeverAnAuthor() {
        LiveRoundState state = new LiveRoundState("pub-1", RoundPhase.SUBMIT, "slide-followup", Instant.now(), null,
                null, 0L, false);
        Slide parent = mcqSlide();
        FollowUpConfigView followUp = FollowUpConfigView.from(
                (FollowUpContent) followUpSlide().getContent(), parent, followUpCandidates());

        RoundStarted event = SessionEvents.roundStarted(state, followUpSlide(), answerSettings(), NO_IMAGES,
                followUp, false);

        // The board names what it is asking about and renders in minted order —
        // everyone votes against the same numbered list.
        assertThat(event.slide().followUp()).isNotNull();
        assertThat(event.slide().followUp().mode()).isEqualTo(FollowUpMode.BEST_ANSWER_VOTE);
        assertThat(event.slide().followUp().parentSlideId()).isEqualTo("slide-1");
        assertThat(event.slide().followUp().parentTitle()).isEqualTo("Capital of Gondor?");
        assertThat(event.slide().followUp().options()).extracting("optionId")
                .containsExactly("cand-1", "cand-2");
        assertThat(event.slide().followUp().options()).extracting("text")
                .containsExactly("Minas Tirith", "Osgiliath");
        // A follow-up round is not itself a parent.
        assertThat(event.slide().hasFollowUp()).isFalse();

        // The authorship mapping is what makes the board anonymous (and self-vote
        // rejection trustworthy) — it must not survive onto the wire.
        String json = codec.serialize(event);
        assertThat(json).contains("cand-1");
        assertThat(json).doesNotContain("authorParticipantIds");
        assertThat(json).doesNotContain("player-writer-2");
        assertThat(json).doesNotContain("player-writer-3");
    }

    @Test
    void aParentRoundIsMarkedAsHavingAFollowUpAndCarriesNoBoardOfItsOwn() {
        LiveRoundState state = new LiveRoundState("pub-1", RoundPhase.SUBMIT, "slide-1", Instant.now(), null, null,
                0L, false);

        RoundStarted event = SessionEvents.roundStarted(state, mcqSlide(), answerSettings(), NO_IMAGES, null, true);

        // The host bar reads this to drop "Reveal answers" and advance into the child.
        assertThat(event.slide().hasFollowUp()).isTrue();
        assertThat(event.slide().followUp()).isNull();
    }

    @Test
    void anUnrelatedSlideCarriesNoFollowUpDimension() {
        SlideView view = SlideView.from(textSlide(), null, NO_IMAGES);

        assertThat(view.followUp()).isNull();
        assertThat(view.hasFollowUp()).isFalse();
    }

    @Test
    void submissionsLockedCarriesNoCounts() {
        // A hidden lock must not ship the distribution: the record has no counts field.
        String json = codec.serialize(SessionEvents.submissionsLocked("slide-1"));

        assertThat(json).contains("SubmissionsLocked").contains("slide-1");
        assertThat(json).doesNotContain("optionCounts");
    }

    @Test
    void votingOpenedCarriesOpaqueOptionsButNeverTheAuthor() {
        // The deception guarantee: the wire options must not let a client map an
        // option back to the participant who wrote it.
        List<VoteOptionView> options = VoteOptionView.from(
                Map.of("opt-1", new VoteOption("participant-secret-9", "a plausible lie", null)));

        String json = codec.serialize(SessionEvents.votingOpened("slide-1", options));

        assertThat(json).contains("VotingOpened").contains("opt-1").contains("a plausible lie");
        assertThat(json).doesNotContain("participant-secret-9");
    }

    @Test
    void voteCastCarriesOnlyTheRunningCount() {
        // Per-option tallies would sway voters still deciding — only the count travels.
        String json = codec.serialize(SessionEvents.voteCast("slide-1", 4));

        assertThat(json).contains("VoteCast").contains("\"votesCast\":4");
        assertThat(json).doesNotContain("optionCounts").doesNotContain("optionId");
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
