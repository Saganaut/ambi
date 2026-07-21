package com.cephadex.ambi.session.liveSession.enums;

/**
 * The phase of a single live round. A round has three independent concerns —
 * whether submissions are still accepted, whether best-answer votes are being
 * collected, and what participants are shown — but they are modelled as one
 * enumerated enum (the valid combinations) rather than separate fields. The
 * {@code is*}/{@code shows*}/{@code accepts*} predicates below are the single
 * home for the derived axes, so guards, the event mapper, and clients read
 * intent instead of matching values.
 *
 * <table>
 * <caption>submission × voting × display</caption>
 * <tr><th>value</th><th>submissions</th><th>votes</th><th>display</th></tr>
 * <tr><td>{@code SUBMIT}</td><td>open</td><td>—</td><td>hidden</td></tr>
 * <tr><td>{@code SUBMIT_LIVE}</td><td>open</td><td>—</td><td>responses (live distribution)</td></tr>
 * <tr><td>{@code LOCKED}</td><td>closed</td><td>—</td><td>hidden</td></tr>
 * <tr><td>{@code VOTE}</td><td>closed</td><td>open</td><td>responses (the anonymised vote options)</td></tr>
 * <tr><td>{@code REVEAL_RESPONSES}</td><td>closed</td><td>—</td><td>responses</td></tr>
 * <tr><td>{@code REVEAL_RESULTS}</td><td>closed</td><td>—</td><td>scored results + answer key</td></tr>
 * </table>
 *
 * <p>Invariant: scored results require closed submissions — there is no
 * open+results value. Revealing results from an open round closes and scores it
 * first (atomically under the session lock), so the answer key can never leak to
 * players who are still answering. Live mode ({@code SUBMIT_LIVE}) shows only the
 * response distribution, never the key.
 *
 * <p>Second invariant: voting requires closed submissions but precedes scoring.
 * {@code VOTE} is the one closed phase whose round is <em>not yet scored</em> —
 * best-answer/deception points depend on the votes, so a round entered via
 * voting is scored on the {@code VOTE → REVEAL_RESULTS} transition instead of at
 * close (D3).
 */
public enum RoundPhase {
    /** Open and taking submissions; nothing shown to participants. */
    SUBMIT,
    /** Open and taking submissions while the live response distribution is shown (no answer key). */
    SUBMIT_LIVE,
    /** Submissions closed; nothing revealed yet (locked, awaiting a reveal). */
    LOCKED,
    /** Submissions closed; the anonymised submissions are shown and best-answer votes are being collected (D3). */
    VOTE,
    /** Submissions closed; the final response distribution is shown, not yet scored. */
    REVEAL_RESPONSES,
    /** Submissions closed; the scored results and correct answer are shown (combined parent+child for a follow-up). */
    REVEAL_RESULTS;

    /** Whether participants may still submit answers in this phase. */
    public boolean acceptsSubmissions() {
        return this == SUBMIT || this == SUBMIT_LIVE;
    }

    /** Whether participants may cast best-answer/deception votes in this phase (D3). */
    public boolean acceptsVotes() {
        return this == VOTE;
    }

    /** Whether the response distribution is visible (live, final, as vote options, or alongside results). */
    public boolean showsResponses() {
        return this == SUBMIT_LIVE || this == VOTE || this == REVEAL_RESPONSES || this == REVEAL_RESULTS;
    }

    /** Whether the scored results / correct answer are visible. */
    public boolean showsResults() {
        return this == REVEAL_RESULTS;
    }

    /** Whether submissions are closed in this phase. */
    public boolean isClosed() {
        return !acceptsSubmissions();
    }
}
