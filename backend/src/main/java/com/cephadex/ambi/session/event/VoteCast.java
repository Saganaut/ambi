package com.cephadex.ambi.session.event;

/**
 * A participant cast (or changed) their vote in the open voting round (D3).
 * Carries only the running number of votes cast — never per-option counts,
 * which would sway voters still deciding; the tallies surface only through the
 * scored {@link ResultsRevealed}.
 */
public record VoteCast(String slideId, int votesCast) implements SessionEvent {
}
