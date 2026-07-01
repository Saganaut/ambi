package com.cephadex.ambi.session.event;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqDataVisualization;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
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

    @Test
    void slideViewKeepsOptionsButDropsAnswerKeyAndNotes() {
        SlideView view = SlideView.from(mcqSlide());

        assertThat(view.options()).extracting("id").containsExactly("opt-a", "opt-b");

        // The answer key, speaker notes, and explanation must not survive into the wire view.
        String json = codec.serialize(view);
        assertThat(json).doesNotContain("correctOptionIds");
        assertThat(json).doesNotContain("psst");
        assertThat(json).doesNotContain("Minas Tirith is the capital");
    }

    @Test
    void roundStartedEventCarriesNoAnswerKey() {
        LiveRoundState state = new LiveRoundState("pub-1", RoundPhase.SUBMIT, "slide-1", Instant.now());

        String json = codec.serialize(SessionEvents.roundStarted(state, mcqSlide()));

        assertThat(json).contains("RoundStarted").contains("opt-a");
        assertThat(json).doesNotContain("correctOptionIds");
    }

    @Test
    void liveResultsShownCarriesSlideAndCountsButNoAnswerKey() {
        LiveRoundState state = new LiveRoundState("pub-1", RoundPhase.SUBMIT_LIVE, "slide-1", Instant.now());

        String json = codec.serialize(SessionEvents.liveResultsShown(state, mcqSlide(), Map.of("opt-a", 3)));

        assertThat(json).contains("LiveResultsShown").contains("opt-a");
        assertThat(json).doesNotContain("correctOptionIds");
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
