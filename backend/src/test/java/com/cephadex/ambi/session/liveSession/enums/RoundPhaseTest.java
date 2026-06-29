package com.cephadex.ambi.session.liveSession.enums;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * The two derived axes (submission open/closed, what's displayed) are encoded as
 * predicates over the single enum; these pin them down for every value.
 */
class RoundPhaseTest {

    @Test
    void acceptsSubmissionsOnlyWhileOpen() {
        assertThat(RoundPhase.SUBMIT.acceptsSubmissions()).isTrue();
        assertThat(RoundPhase.SUBMIT_LIVE.acceptsSubmissions()).isTrue();
        assertThat(RoundPhase.LOCKED.acceptsSubmissions()).isFalse();
        assertThat(RoundPhase.REVEAL_RESPONSES.acceptsSubmissions()).isFalse();
        assertThat(RoundPhase.REVEAL_RESULTS.acceptsSubmissions()).isFalse();
    }

    @Test
    void isClosedIsTheComplementOfAcceptsSubmissions() {
        for (RoundPhase phase : RoundPhase.values()) {
            assertThat(phase.isClosed()).isEqualTo(!phase.acceptsSubmissions());
        }
    }

    @Test
    void showsResponsesForLiveAndBothReveals() {
        assertThat(RoundPhase.SUBMIT.showsResponses()).isFalse();
        assertThat(RoundPhase.LOCKED.showsResponses()).isFalse();
        assertThat(RoundPhase.SUBMIT_LIVE.showsResponses()).isTrue();
        assertThat(RoundPhase.REVEAL_RESPONSES.showsResponses()).isTrue();
        assertThat(RoundPhase.REVEAL_RESULTS.showsResponses()).isTrue();
    }

    @Test
    void showsResultsOnlyForRevealResults() {
        for (RoundPhase phase : RoundPhase.values()) {
            assertThat(phase.showsResults()).isEqualTo(phase == RoundPhase.REVEAL_RESULTS);
        }
    }

    @Test
    void resultsAreNeverShownWhileOpen() {
        // The core invariant: no value both accepts submissions and shows results.
        for (RoundPhase phase : RoundPhase.values()) {
            assertThat(phase.acceptsSubmissions() && phase.showsResults()).isFalse();
        }
    }
}
