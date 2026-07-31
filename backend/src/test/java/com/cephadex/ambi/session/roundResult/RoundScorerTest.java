package com.cephadex.ambi.session.roundResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.FollowUpContent;
import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.FollowUpAnswer;
import com.cephadex.ambi.session.followUp.FollowUpOption;
import com.cephadex.ambi.session.followUp.FollowUpOptionSet;
import com.cephadex.ambi.session.participant.Participant;

/**
 * Closing a {@code SPOT_THE_ANSWER} round: the author-side pass that reaches
 * earners with no answer of their own — they take the points onto their running
 * score, but no {@code ParticipantOutcome} and no streak change — and the rule
 * that an author present in the round is paid exactly once, through their own
 * evaluation. Also the {@link Participant#awardDeception} primitive that pass
 * relies on.
 */
class RoundScorerTest {

    private static final String SID = "session-1";
    private static final Instant START = Instant.parse("2026-01-01T00:00:00Z");
    private static final Instant CLOSED = START.plusSeconds(30);

    // ── absent authors (the extra pass) ───────────────────────────────────────

    @Test
    void absentAuthorTakesTheirPicksOntoTheRunningScoreWithNoOutcomeOrStreakChange() {
        Participant absentAuthor = participant("author");
        // A streak carried in from earlier rounds: not answering must not end it.
        absentAuthor.awardPoints(true, false, false, 0, 10, 0, 0, 0, true, null);
        Participant picker = participant("picker");

        RoundResult result = RoundScorer.score(SID, followUpSlide(),
                List.of(answer(picker, "opt-a", 100)),
                roster(absentAuthor, picker),
                points(10, 5),
                Map.of(),
                board(absentAuthor),
                START, CLOSED);

        // One pick × 5 deception points, on top of the 10 carried in.
        assertThat(absentAuthor.getScore().getPoints()).isEqualTo(15);
        assertThat(absentAuthor.getScore().getCurrentStreak()).isEqualTo(1);
        assertThat(absentAuthor.getScore().getTotalCorrectAnswers()).isEqualTo(1);
        // The round records only the people who played it, so its participant
        // count and response-time average stay honest.
        assertThat(result.perParticipant()).extracting(outcome -> outcome.participantId())
                .containsExactly(picker.getParticipantId());
        assertThat(result.numberOfParticipants()).isEqualTo(1);
    }

    @Test
    void authorWhoAlsoPlayedIsPaidOnceThroughTheirOwnEvaluation() {
        Participant author = participant("author");
        Participant firstFooled = participant("fooled-1");
        Participant secondFooled = participant("fooled-2");

        RoundResult result = RoundScorer.score(SID, followUpSlide(),
                List.of(answer(author, "seed", 100),
                        answer(firstFooled, "opt-a", 200),
                        answer(secondFooled, "opt-a", 300)),
                roster(author, firstFooled, secondFooled),
                points(10, 5),
                Map.of(),
                board(author),
                START, CLOSED);

        // 10 for spotting the seeded answer + 2 picks × 5 for the card that
        // fooled them — applied once, by awardPoints, not again by the absent pass.
        assertThat(author.getScore().getPoints()).isEqualTo(20);
        assertThat(result.perParticipant()).filteredOn(
                outcome -> outcome.participantId().equals(author.getParticipantId()))
                .singleElement()
                .satisfies(outcome -> {
                    assertThat(outcome.correct()).isTrue();
                    assertThat(outcome.points()).isEqualTo(20);
                });
        assertThat(result.numberOfParticipants()).isEqualTo(3);
    }

    @Test
    void anImageBoardScoresExactlyLikeATextOne() {
        // The mode-genericity proof for the dixit extension to DRAWING parents:
        // scoring reads the snapshot's `authoredAnswer` flag and its author sets,
        // never a candidate's text — so a board whose cards are pictures pays the
        // spotter and the author through the very same path.
        Participant spotter = participant("spotter");
        Participant drawer = participant("drawer");
        FollowUpOptionSet imageBoard = new FollowUpOptionSet(List.of(
                new FollowUpOption("seed", null, "https://cdn/opaque/answer", Set.of(), true),
                new FollowUpOption("opt-a", null, "https://cdn/opaque/one",
                        Set.of(drawer.getParticipantId()), false)));

        RoundResult result = RoundScorer.score(SID, followUpSlide(),
                List.of(answer(spotter, "seed", 100), answer(drawer, "opt-a", 200)),
                roster(spotter, drawer),
                points(10, 5),
                Map.of(),
                imageBoard,
                START, CLOSED);

        // The spotter picked the seeded picture: an ordinary correct grade.
        assertThat(spotter.getScore().getPoints()).isEqualTo(10);
        assertThat(result.perParticipant()).filteredOn(
                outcome -> outcome.participantId().equals(spotter.getParticipantId()))
                .singleElement()
                .satisfies(outcome -> assertThat(outcome.correct()).isTrue());
        // The drawer's own card drew a pick from someone else — a self-pick, so
        // it pays nothing; picking their own card also grades incorrect.
        assertThat(drawer.getScore().getPoints()).isZero();
    }

    @Test
    void anImageCardThatFooledTheRoomPaysItsDrawer() {
        Participant drawer = participant("drawer");
        Participant fooled = participant("fooled");
        FollowUpOptionSet imageBoard = new FollowUpOptionSet(List.of(
                new FollowUpOption("seed", null, "https://cdn/opaque/answer", Set.of(), true),
                new FollowUpOption("opt-a", null, "https://cdn/opaque/one",
                        Set.of(drawer.getParticipantId()), false)));

        RoundScorer.score(SID, followUpSlide(),
                List.of(answer(fooled, "opt-a", 100)),
                roster(drawer, fooled),
                points(10, 5),
                Map.of(),
                imageBoard,
                START, CLOSED);

        // One pick × 5 deception points, through `awardAbsentAuthors` — the
        // drawer never played the follow-up round itself.
        assertThat(drawer.getScore().getPoints()).isEqualTo(5);
        assertThat(fooled.getScore().getPoints()).isZero();
    }

    @Test
    void departedAndBannedAuthorsAreSkippedRatherThanFailingTheRound() {
        Participant banned = participant("banned-author");
        banned.ban();
        Participant firstPicker = participant("picker-1");
        Participant secondPicker = participant("picker-2");
        // "departed" wrote a card in the parent round and has since been removed:
        // the board still names them, but there is no live score to mutate.
        FollowUpOptionSet board = new FollowUpOptionSet(List.of(
                new FollowUpOption("seed", "Paris", null, Set.of(), true),
                new FollowUpOption("opt-a", "Lyon", null, Set.of("departed"), false),
                new FollowUpOption("opt-b", "Nice", null, Set.of(banned.getParticipantId()), false)));

        RoundResult result = RoundScorer.score(SID, followUpSlide(),
                List.of(answer(firstPicker, "opt-a", 100), answer(secondPicker, "opt-b", 200)),
                roster(banned, firstPicker, secondPicker),
                points(10, 5),
                Map.of(),
                board,
                START, CLOSED);

        assertThat(banned.getScore().getPoints()).isZero();
        assertThat(result.numberOfParticipants()).isEqualTo(2);
    }

    @Test
    void zeroDeceptionPointsCreditsAnAbsentAuthorNothing() {
        Participant absentAuthor = participant("author");
        Participant picker = participant("picker");

        RoundScorer.score(SID, followUpSlide(),
                List.of(answer(picker, "opt-a", 100)),
                roster(absentAuthor, picker),
                points(10, 0),
                Map.of(),
                board(absentAuthor),
                START, CLOSED);

        assertThat(absentAuthor.getScore().getPoints()).isZero();
        assertThat(absentAuthor.getScore().getDeceptionPoints()).isZero();
    }

    // ── Participant.awardDeception (the primitive that pass uses) ─────────────

    @Test
    void awardDeceptionAddsTheDeltaWithoutTouchingStreakState() {
        Participant player = participant("player");
        player.awardPoints(true, false, false, 0, 10, 0, 0, 0, true, null);

        int awarded = player.awardDeception(3, 5);

        assertThat(awarded).isEqualTo(15);
        assertThat(player.getScore().getPoints()).isEqualTo(25);
        assertThat(player.getScore().getDeceptionPoints()).isEqualTo(15);
        // Not answering is not answering incorrectly: the streak stands.
        assertThat(player.getScore().getCurrentStreak()).isEqualTo(1);
        assertThat(player.getScore().getTotalCorrectAnswers()).isEqualTo(1);
    }

    @Test
    void awardDeceptionAwardsNothingForNonPositiveInputs() {
        Participant player = participant("player");

        assertThat(player.awardDeception(0, 5)).isZero();
        assertThat(player.awardDeception(3, 0)).isZero();
        assertThat(player.awardDeception(-2, 5)).isZero();
        assertThat(player.getScore().getPoints()).isZero();
    }

    @Test
    void awardDeceptionRejectsABannedParticipant() {
        Participant banned = participant("banned");
        banned.ban();

        assertThatThrownBy(() -> banned.awardDeception(3, 5))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("banned");
        assertThat(banned.getScore().getPoints()).isZero();
    }

    // ── fixtures ──────────────────────────────────────────────────────────────

    private static Slide followUpSlide() {
        Slide slide = new Slide();
        slide.setId("slide-1");
        slide.setContent(new FollowUpContent(FollowUpMode.SPOT_THE_ANSWER));
        return slide;
    }

    /** The seeded answer plus one card written by {@code author} in the parent round. */
    private static FollowUpOptionSet board(Participant author) {
        return new FollowUpOptionSet(List.of(
                new FollowUpOption("seed", "Paris", null, Set.of(), true),
                new FollowUpOption("opt-a", "Lyon", null, Set.of(author.getParticipantId()), false)));
    }

    private static Participant participant(String userId) {
        return Participant.join(userId, userId, null, null);
    }

    private static Map<String, Participant> roster(Participant... participants) {
        Map<String, Participant> byId = new LinkedHashMap<>();
        for (Participant participant : participants) {
            byId.put(participant.getParticipantId(), participant);
        }
        return byId;
    }

    private static Settings.PointSettings points(int correct, int deception) {
        return new Settings.PointSettings(correct, deception, 0, 0, null, true);
    }

    private static Answer answer(Participant participant, String optionId, long msAfterStart) {
        return answer(participant.getParticipantId(), new FollowUpAnswer(optionId), msAfterStart);
    }

    private static Answer answer(String participantId, AnswerPayload payload, long msAfterStart) {
        Answer answer = new Answer();
        answer.setParticipantId(participantId);
        answer.setSessionId(SID);
        answer.setSlideId("slide-1");
        answer.setSubmittedAt(START.plusMillis(msAfterStart));
        answer.setPayload(payload);
        return answer;
    }
}
