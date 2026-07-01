// Pure resolver for which host controls are available, given the live round
// state. Extracted from SessionControls so the (backend-coupled) phase gating
// lives in one unit-testable place — a wrong gate here enables a button whose
// command the backend rejects, so it is asserted against every phase.
//
// It mirrors the backend round state machine (see LiveSessionOrchestrator +
// RoundPhase): submissions are open in SUBMIT / SUBMIT_LIVE and closed in
// LOCKED / REVEAL_RESPONSES / REVEAL_RESULTS. The only transitions offered:
//   - showResponses  → go live (SUBMIT → SUBMIT_LIVE); backend rejects nothing
//                      but it only makes sense before the round is live.
//   - close          → lock + score (SUBMIT/SUBMIT_LIVE → LOCKED/REVEAL_RESPONSES).
//   - revealResults   → disclose answer + scores; backend REQUIRES a prior close
//                      (throws while submissions are open), so this is gated to
//                      the closed-but-unrevealed phases only.
//   - advance         → next round (offered once results are revealed, or
//                      immediately for a display slide with no submit phase).
//   - restart         → reopen; backend rejects a round already scored at close,
//                      so this is gated to the still-open phases only.
import type { LiveSessionLifecycle, RoundPhase } from "../../store/liveSessionEvents";

export interface HostActions {
  canShowResponses: boolean;
  canClose: boolean;
  canRevealResults: boolean;
  canAdvance: boolean;
  canRestart: boolean;
}

const NONE: HostActions = {
  canShowResponses: false,
  canClose: false,
  canRevealResults: false,
  canAdvance: false,
  canRestart: false,
};

/**
 * @param isDisplaySlide the current slide carries no answers (a display slide) —
 *   there is no submit phase to close/reveal, so the only action is to advance.
 * @param hasSlide a current slide id exists to target the round commands with.
 */
export const resolveHostActions = (
  status: LiveSessionLifecycle | null,
  phase: RoundPhase | null,
  isDisplaySlide: boolean,
  hasSlide: boolean,
): HostActions => {
  if (status !== "IN_PROGRESS" || !hasSlide) return NONE;

  // Display slides have no submit/close/reveal cycle — just move on.
  if (isDisplaySlide) return { ...NONE, canAdvance: true };

  const accepting = phase === "SUBMIT" || phase === "SUBMIT_LIVE";
  const closedUnrevealed = phase === "LOCKED" || phase === "REVEAL_RESPONSES";

  return {
    canShowResponses: phase === "SUBMIT",
    canClose: accepting,
    canRevealResults: closedUnrevealed,
    canAdvance: phase === "REVEAL_RESULTS",
    // Restart reopens the round; the backend rejects it once scored at close.
    canRestart: accepting,
  };
};
