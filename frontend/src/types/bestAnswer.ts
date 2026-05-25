/**
 * Best Answer mode wire types.
 *
 * These are STOMP-only messages — the OpenAPI codegen doesn't see them, so
 * they're hand-authored here. The literal type strings ("VotePhaseStart" etc.)
 * are not part of the wire format; only the field shapes are.
 */
import type { AnswerPayload, DeckElement } from "./elements";

/**
 * One anonymous submission shown to voters during VOTE phase.
 * `submissionId` is server-generated; we never broadcast the author's identity
 * on this channel. The mapping back to the author happens at REVEAL time
 * inside `BestAnswerOutcome.tallies`, keyed by session-scoped playerId.
 */
export interface AnonymizedSubmission {
  submissionId: string;
  payload: AnswerPayload;
}

/** /topic/interactive-session/{code}/votePhase */
export interface VotePhaseStartPayload {
  round: number;
  element: DeckElement;          // still redacted (no correct answer)
  submissions: AnonymizedSubmission[];
  timePerVote: number;           // 0 = no timer
  phaseStartedAt: string;
}

/** /topic/interactive-session/{code}/voted */
export interface VoteProgressPayload {
  round: number;
  // Session-scoped playerIds of players who have already voted this round.
  votedPlayerIds: string[];
  totalPlayers: number;
}

/** REVEAL: per-submission tally with the author de-anonymized. */
export interface SubmissionTally {
  submissionId: string;
  // Session-scoped public handle of the submission's author. Real userId is
  // never broadcast on this channel.
  playerId: string;
  userName: string;
  payload: AnswerPayload;
  voteCount: number;
}

/**
 * Attached to RoundResultMessage when the round was a Best Answer round.
 * `winnerPlayerIds` can have multiple entries on a tie; each receives the bonus.
 * `bonusAwarded` is already reflected in the corresponding playerResults entry.
 */
export interface BestAnswerOutcome {
  tallies: SubmissionTally[];
  winnerPlayerIds: string[];
  bonusAwarded: number;
}
