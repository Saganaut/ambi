package com.cephadex.ambi.session.event;

import java.util.List;

import com.cephadex.ambi.session.event.dto.VoteOptionView;

/**
 * The round entered
 * {@link com.cephadex.ambi.session.liveSession.enums.RoundPhase#VOTE VOTE}:
 * submissions closed (unscored — scoring waits for the votes) and best-answer
 * voting opened on the carried options (D3). Options are anonymised and sorted
 * by their random ids, so their order carries no authorship hint and matches
 * what a reconnecting client seeds from the snapshot.
 */
public record VotingOpened(String slideId, List<VoteOptionView> options) implements SessionEvent {
}
