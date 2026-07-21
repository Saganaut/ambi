// Pure resolver for which host controls are available, given the live round
// state. Extracted from SessionControls so the (backend-coupled) phase gating
// lives in one unit-testable place — a wrong gate here enables a button whose
// command the backend rejects, so it is asserted against every phase.
//
// It mirrors the backend round state machine (see LiveSessionOrchestrator +
// RoundPhase): submissions are open in SUBMIT / SUBMIT_LIVE and closed in
// LOCKED / VOTE / REVEAL_RESPONSES / REVEAL_RESULTS. The only transitions offered:
//   - showResponses  → go live (SUBMIT → SUBMIT_LIVE); backend rejects nothing
//                      but it only makes sense before the round is live.
//   - close          → lock + score (SUBMIT/SUBMIT_LIVE → LOCKED/REVEAL_RESPONSES).
//   - openVoting     → close unscored + collect best-answer votes (D3;
//                      SUBMIT/SUBMIT_LIVE → VOTE). Only from an open round — a
//                      normal close scores immediately, after which the backend
//                      rejects voting — and only for the free-form kinds that
//                      mint votable options.
//   - revealResults   → disclose answer + scores; the backend closes + scores an
//                      open round in the same step (and scores a VOTE round with
//                      its tallies), so this is offered in every phase except
//                      once results are already revealed.
//   - advance         → open the next round (offered when no round is open yet —
//                      just started, so advance opens the first slide — once
//                      results are revealed, or immediately for a display slide).
//   - restart         → reopen; backend rejects a round already scored at close,
//                      so this is gated to the still-open phases only.
//   - pause/resumeTimer → freeze/unfreeze a timed round's auto-close countdown
//                      (ADR 002); only while the timed round is still accepting.
import type { LiveSessionLifecycle, RoundPhase } from "../../store/liveSessionEvents";

export interface HostActions {
  canShowResponses: boolean;
  canClose: boolean;
  canOpenVoting: boolean;
  canRevealResults: boolean;
  canAdvance: boolean;
  canRestart: boolean;
  canPauseTimer: boolean;
  canResumeTimer: boolean;
}

const NONE: HostActions = {
  canShowResponses: false,
  canClose: false,
  canOpenVoting: false,
  canRevealResults: false,
  canAdvance: false,
  canRestart: false,
  canPauseTimer: false,
  canResumeTimer: false,
};

/**
 * @param isDisplaySlide the current slide carries no answers (a display slide) —
 *   there is no submit phase to close/reveal, so the only action is to advance.
 * @param hasSlide a current slide id exists to target the round commands with.
 * @param timed the open round has an auto-close timer (a deadline was broadcast).
 * @param timerPaused the round timer is currently paused.
 * @param votableSlide the slide's kind mints votable options (free text, drawing,
 *   follow-up, number) — the only rounds the backend opens voting on (D3).
 */
export const resolveHostActions = (
  status: LiveSessionLifecycle | null,
  phase: RoundPhase | null,
  isDisplaySlide: boolean,
  hasSlide: boolean,
  timed = false,
  timerPaused = false,
  votableSlide = false,
): HostActions => {
  if (status !== "IN_PROGRESS") return NONE;

  // In progress but no round is open — beginPlay flips the session to IN_PROGRESS
  // without opening a round (it says so explicitly), so the host must open the
  // first round to get a slide on the board. Advance resolves the first/next
  // slide server-side; every other action needs an open round to target.
  if (!hasSlide) return { ...NONE, canAdvance: true };

  // Display slides have no submit/close/reveal cycle — just move on.
  if (isDisplaySlide) return { ...NONE, canAdvance: true };

  const accepting = phase === "SUBMIT" || phase === "SUBMIT_LIVE";
  const voting = phase === "VOTE";
  const closedUnrevealed = phase === "LOCKED" || phase === "REVEAL_RESPONSES";

  return {
    canShowResponses: phase === "SUBMIT",
    canClose: accepting,
    // Voting must open from an open round (a normal close scores immediately);
    // only offered when the slide's kind can mint votable options.
    canOpenVoting: accepting && votableSlide,
    // The backend closes + scores an open round when results are revealed (and
    // scores a VOTE round with its tallies), so this is offered while open and
    // while voting too — every phase but REVEAL_RESULTS (already shown).
    canRevealResults: accepting || voting || closedUnrevealed,
    canAdvance: phase === "REVEAL_RESULTS",
    // Restart reopens the round; the backend rejects it once scored at close —
    // a VOTE round is not yet scored, so backing out of voting is allowed.
    canRestart: accepting || voting,
    // The backend rejects pause/resume on a closed or untimed round; pause and
    // resume are each other's complements while the timer exists.
    canPauseTimer: accepting && timed && !timerPaused,
    canResumeTimer: accepting && timed && timerPaused,
  };
};
