package com.cephadex.ambi.session.liveSession;

// TODO(Claude): entire class is a stub — every operation below throws UnsupportedOperationException; implement the round interactions.
public class Round {

    // TODO(Claude): read once the round interactions below are implemented.
    @SuppressWarnings("unused")
    private final LiveSessionRepository repository;

    public Round(LiveSessionRepository repository) {
        this.repository = repository;
    }

    // TODO(Claude): implement — persist/record a participant's answer for the current round.
    public void submitAnswer() {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    // TODO(Claude): implement — record a participant's vote (e.g. best-answer/deception voting).
    public void submitVote() {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    // TODO(Claude): implement — pause the round's submission timer.
    public void pauseTimer() {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    // TODO(Claude): implement — resume the round's submission timer.
    public void resumeTimer() {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    // TODO(Claude): implement — restart the current round (clear answers/tallies, reset start time).
    public void restartRound() {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    // TODO(Claude): implement — reveal the collected responses to participants.
    public void revealRoundResponses() {
        throw new UnsupportedOperationException("Not implemented yet");

    }

    // TODO(Claude): implement — reveal the scored results for the round.
    public void revealRoundResults() {
        throw new UnsupportedOperationException("Not implemented yet");
    }

}
