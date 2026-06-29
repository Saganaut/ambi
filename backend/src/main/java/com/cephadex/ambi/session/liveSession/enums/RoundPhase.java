package com.cephadex.ambi.session.liveSession.enums;

/**
 * The phase of a single live round, authoritative in Redis ({@code LiveRoundState})
 * and mirrored onto the {@code LiveSession} document via {@code recordPhase}.
 *
 * <p>A standalone slide runs {@code SUBMIT → REVEAL_RESPONSES → REVEAL_RESULTS}.
 * A linked parent/child slide pair runs the parent through
 * {@code SUBMIT → REVEAL_RESPONSES}, advances into the child round
 * ({@code SUBMIT → REVEAL_RESPONSES}), and only then shows the combined
 * {@code REVEAL_RESULTS} — a parent slide is never taken straight to results
 * (see {@code Slide.parentId/childId}).
 */
public enum RoundPhase {
    /** The round is open and taking submissions. */
    SUBMIT,
    /** Submissions are closed; participants' answers/tally are shown, not yet scored. */
    REVEAL_RESPONSES,
    /** The scored results are shown (combined parent+child results for a follow-up). */
    REVEAL_RESULTS
}
