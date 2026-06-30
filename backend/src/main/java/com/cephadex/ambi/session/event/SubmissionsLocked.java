package com.cephadex.ambi.session.event;

/**
 * The round entered
 * {@link com.cephadex.ambi.session.liveSession.enums.RoundPhase#LOCKED LOCKED}:
 * submissions are closed but nothing is revealed yet. Deliberately carries no
 * counts — the distribution stays concealed until a later reveal
 * ({@link ResponsesRevealed} / {@link ResultsRevealed}).
 */
public record SubmissionsLocked(String slideId) implements SessionEvent {
}
