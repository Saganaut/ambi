// Pure resolver that turns the live session state into the single "stage" the
// SessionBoard should render. It exists so SessionBoard.tsx stays a thin switch
// and the precedence rules — lobby vs slide vs question-moment vs final results —
// live in one place that can be unit-tested without a DOM.
//
// Two orthogonal axes decide the board: WHAT content (`currentSlide.contentType`)
// and WHICH moment (the round `phase`). This collapses both into a discriminated
// `BoardStage` so the renderer never has to re-derive any of it.
import type { SlideView } from "../../store/liveSessionApi.gen";
import type { RoundPhase } from "../../store/liveSessionEvents";
import type { LiveSessionState } from "../../store/liveSessionSlice";

/**
 * `mode` for the question stage:
 *   - prompt      — accepting answers (or locked but not yet revealed); show the
 *                   question, interactive only on a participant's own device.
 *   - liveResults — the response tally is visible while answering / responses
 *                   revealed, but the correct answer is not yet disclosed.
 *   - vote        — best-answer voting (D3): the anonymised submissions are up
 *                   for votes; interactive on a participant's own device.
 *   - results     — results revealed: distribution + correct-answer highlight.
 */
export type BoardQuestionMode = "prompt" | "liveResults" | "vote" | "results";

// TEMP (MCQ bring-up): the host normally watches a read-only projected board
// while participants answer on their own devices. While we wire up answering we
// let the host answer on the same board too, so a single browser can drive a
// whole round end-to-end. Flip back to `!viewerIsHost` once multi-device
// testing is in place. `as boolean` (not a literal) keeps this a real runtime
// toggle so the eventual `!viewerIsHost` branch stays live code.
const HOST_CAN_PARTICIPATE = true as boolean;

// Content types that carry no answers or results — displayed identically for
// everyone. Everything else is an answerable question (MCQ has a built surface;
// the rest fall through to a placeholder).
const DISPLAY_CONTENT_TYPES: SlideView["contentType"][] = ["TITLE", "MEDIA"];

/** Whether a slide is display-only (no submit/close/reveal cycle). */
export const isDisplaySlide = (slide: SlideView): boolean =>
  DISPLAY_CONTENT_TYPES.includes(slide.contentType);

// The free-form kinds whose submissions the backend can mint vote options from
// (D3) — mirrors LiveSessionOrchestrator.votableOption.
//
// FOLLOW_UP is deliberately NOT one of them: a follow-up round is an ordinary
// REGULAR round whose options were minted from its *parent's* submissions, so a
// pick travels the regular answer path (SUBMIT → close → reveal) and the round
// never enters the VOTE phase. The VOTE machinery here stays what it always
// was — voting on the *current* round's own free-text submissions (D3).
const VOTABLE_CONTENT_TYPES: SlideView["contentType"][] = [
  "TEXT",
  "NUMBER",
  "DRAWING",
];

/** Whether a slide's kind supports best-answer voting (D3). */
export const isVotableSlide = (slide: SlideView): boolean =>
  VOTABLE_CONTENT_TYPES.includes(slide.contentType);

export type BoardStage =
  | { type: "lobby" }
  | { type: "slide"; slide: SlideView }
  | {
      type: "question";
      slide: SlideView;
      mode: BoardQuestionMode;
      // True only on a participant's own device while the round still accepts
      // answers — the board doubles as the answer surface. Host/projected views
      // and revealed results are always read-only.
      interactive: boolean;
    }
  | { type: "overall" };

/** The board moment implied by the round phase. */
const modeForPhase = (phase: RoundPhase | null): BoardQuestionMode => {
  switch (phase) {
    case "SUBMIT_LIVE":
    case "REVEAL_RESPONSES":
      return "liveResults";
    case "VOTE":
      return "vote";
    case "REVEAL_RESULTS":
      return "results";
    default:
      // SUBMIT / LOCKED / null: still on the prompt (locked is read-only but the
      // distribution is not shown until responses/results are revealed).
      return "prompt";
  }
};

/** Whether the round is still open for this device to answer. */
const acceptingAnswers = (phase: RoundPhase | null): boolean =>
  phase === "SUBMIT" || phase === "SUBMIT_LIVE";

/** Whether this device may interact with the board (answering, or voting). */
const acceptingInput = (phase: RoundPhase | null): boolean =>
  acceptingAnswers(phase) || phase === "VOTE";

/**
 * Resolve the board stage from the live read model. `viewerIsHost` differentiates
 * a projected host screen from a participant device — the only difference between
 * the two views of the same board.
 */
export const resolveBoardStage = (state: LiveSessionState): BoardStage => {
  const { status, phase, currentSlide, viewerIsHost } = state;

  // Terminal / pre-game states ignore the current slide entirely.
  if (status === "LOBBY" || status === null) return { type: "lobby" };
  if (status === "FINISHED" || status === "CANCELLED") {
    return { type: "overall" };
  }

  if (!currentSlide) return { type: "lobby" };

  // Slides never carry answers or results — same display for everyone.
  if (isDisplaySlide(currentSlide)) {
    return { type: "slide", slide: currentSlide };
  }

  return {
    type: "question",
    slide: currentSlide,
    mode: modeForPhase(phase),
    interactive:
      (HOST_CAN_PARTICIPATE || !viewerIsHost) && acceptingInput(phase),
  };
};
