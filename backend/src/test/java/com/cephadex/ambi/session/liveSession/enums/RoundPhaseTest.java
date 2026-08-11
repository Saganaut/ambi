package com.cephadex.ambi.session.liveSession.enums;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.stream.Stream;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * The derived axes (submission open/closed, voting open, what's displayed) are
 * encoded as predicates over the single enum; these pin them down for every value.
 */
class RoundPhaseTest {

    @ParameterizedTest
    @MethodSource("phaseBehaviors")
    void phaseExposesTheExpectedDerivedBehaviors(
            RoundPhase phase,
            boolean acceptsSubmissions,
            boolean acceptsVotes,
            boolean showsResponses,
            boolean showsResults) {
        assertThat(phase.acceptsSubmissions()).isEqualTo(acceptsSubmissions);
        assertThat(phase.isClosed()).isEqualTo(!acceptsSubmissions);
        assertThat(phase.acceptsVotes()).isEqualTo(acceptsVotes);
        assertThat(phase.showsResponses()).isEqualTo(showsResponses);
        assertThat(phase.showsResults()).isEqualTo(showsResults);
        assertThat(phase.acceptsVotes() && phase.acceptsSubmissions()).isFalse();
        assertThat(phase.acceptsVotes() && phase.showsResults()).isFalse();
        assertThat(phase.acceptsSubmissions() && phase.showsResults()).isFalse();
    }

    static Stream<Arguments> phaseBehaviors() {
        return Stream.of(
                Arguments.of(RoundPhase.SUBMIT, true, false, false, false),
                Arguments.of(RoundPhase.SUBMIT_LIVE, true, false, true, false),
                Arguments.of(RoundPhase.LOCKED, false, false, false, false),
                Arguments.of(RoundPhase.VOTE, false, true, true, false),
                Arguments.of(RoundPhase.REVEAL_RESPONSES, false, false, true, false),
                Arguments.of(RoundPhase.REVEAL_RESULTS, false, false, true, true));
    }
}
