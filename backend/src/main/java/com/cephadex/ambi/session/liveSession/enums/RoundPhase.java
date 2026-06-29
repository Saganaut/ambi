package com.cephadex.ambi.session.liveSession.enums;

/**
 * The phase of a single live round. A round has two independent concerns —
 * whether submissions are still accepted, and what participants are shown — but
 * they are modelled as one enumerated enum (the valid combinations) rather than
 * two fields. The {@code is*}/{@code shows*} predicates below are the single home
 * for the two derived axes, so guards, the event mapper, and clients read intent
 * instead of matching values.
 *
 * <table>
 * <caption>submission × display</caption>
 * <tr><th>value</th><th>submissions</th><th>display</th></tr>
 * <tr><td>{@code SUBMIT}</td><td>open</td><td>hidden</td></tr>
 * <tr><td>{@code SUBMIT_LIVE}</td><td>open</td><td>responses (live distribution)</td></tr>
 * <tr><td>{@code LOCKED}</td><td>closed</td><td>hidden</td></tr>
 * <tr><td>{@code REVEAL_RESPONSES}</td><td>closed</td><td>responses</td></tr>
 * <tr><td>{@code REVEAL_RESULTS}</td><td>closed</td><td>scored results + answer key</td></tr>
 * </table>
 *
 * <p>Invariant: scored results require closed submissions — there is no
 * open+results value, and the orchestrator rejects revealing results while open,
 * so the answer key can never leak to players who are still answering. Live mode
 * ({@code SUBMIT_LIVE}) shows only the response distribution, never the key.
 */
public enum RoundPhase {
    /** Open and taking submissions; nothing shown to participants. */
    SUBMIT,
    /** Open and taking submissions while the live response distribution is shown (no answer key). */
    SUBMIT_LIVE,
    /** Submissions closed; nothing revealed yet (locked, awaiting a reveal). */
    LOCKED,
    /** Submissions closed; the final response distribution is shown, not yet scored. */
    REVEAL_RESPONSES,
    /** Submissions closed; the scored results and correct answer are shown (combined parent+child for a follow-up). */
    REVEAL_RESULTS;

    /** Whether participants may still submit/vote in this phase. */
    public boolean acceptsSubmissions() {
        return this == SUBMIT || this == SUBMIT_LIVE;
    }

    /** Whether the response distribution is visible (live or final, including alongside results). */
    public boolean showsResponses() {
        return this == SUBMIT_LIVE || this == REVEAL_RESPONSES || this == REVEAL_RESULTS;
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
