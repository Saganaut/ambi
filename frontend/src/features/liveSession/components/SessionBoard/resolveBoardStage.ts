// Pure resolver that turns the live session state into the single "stage" the
// SessionBoard should render. It exists so SessionBoard.tsx stays a thin switch
// and the (fiddly) precedence rules — lobby vs slide vs question-moment vs final
// results — live in one place that can be unit-tested without a DOM.
//
// Two orthogonal axes decide the board: WHAT content (currentElement.kind) and
// WHICH moment (prompt / live results / revealed results / overall). This
// collapses both into a discriminated `BoardStage` so the renderer never has to
// re-derive any of it.
import type { DeckElement, Slide } from "@/types/elements";
import type { InteractiveSessionResponse } from "@store/AmbiApi";
import type { RoundResultPayload } from "@store/interactiveSessionSlice";
import { resolveShowResponsesFor } from "@utils/showResponsesResolver";

/**
 * `mode` for the question stage:
 *   - prompt      — accepting answers; show the question (interactive on a
 *                   participant's own device, read-only when projected/host).
 *   - liveResults — PRESENTATION opt-in: the tally builds up while answering.
 *   - results     — phase revealed/ended: distribution + correct-answer highlight.
 */
export type BoardQuestionMode = "prompt" | "liveResults" | "results";

// TEMP (MCQ bring-up): the host normally watches a read-only projected board
// while participants answer on their own devices. While we wire up answering we
// let the host answer on the same board too, so a single browser can drive a
// whole round end-to-end. Flip back to `!viewerIsHost` once multi-device
// testing is in place.
// `as boolean` (not a literal) keeps this a real runtime toggle: the eventual
// `!viewerIsHost` branch stays live code, not statically dead.
const HOST_CAN_PARTICIPATE = true as boolean;

export type BoardStage =
  | { type: "lobby" }
  | { type: "slide"; slide: Slide }
  | {
      type: "question";
      element: DeckElement;
      mode: BoardQuestionMode;
      // True only on a participant's own device while the round still accepts
      // answers — the board doubles as the answer surface. Host/projected views
      // and revealed results are always read-only.
      interactive: boolean;
    }
  | { type: "overall" };

/**
 * Resolve the board stage from the frozen session snapshot. `viewerIsHost` is
 * passed in (rather than recomputed) because the caller already knows it and a
 * projected host screen and a participant device differ only by this flag.
 */
export const resolveBoardStage = (
  session: InteractiveSessionResponse,
  viewerIsHost: boolean,
  // The live round result, once it lands for the current element. The backend
  // never sets a REVEAL phase for a normal round — it signals the reveal by
  // broadcasting /roundResult — so the presence of this is what flips the
  // board from prompt to results (mirrors how Gen-1 PlayPage gated submit on
  // `phase === "SUBMIT" && !roundResult`).
  roundResult?: RoundResultPayload | null,
): BoardStage => {
  // Terminal / pre-game states ignore the current element entirely.
  if (session.status === "LOBBY") return { type: "lobby" };
  if (
    session.status === "RESULTS" ||
    session.status === "FINISHED" ||
    session.status === "CANCELLED"
  ) {
    return { type: "overall" };
  }

  const element = session.deckSnapshot[session.currentRound];
  if (!element) return { type: "lobby" };

  // Slides never carry answers or results — same display for everyone.
  if (element.kind === "Slide") return { type: "slide", slide: element };

  // A round is "revealed" once its result lands (the normal end-of-round path),
  // the host manually reveals this element (ON_CLICK cascade), or — for forward
  // compatibility — the session ever reports a REVEAL phase. Any of these flips
  // the board to results.
  const revealed =
    (roundResult != null && roundResult.element.id === element.id) ||
    session.revealedElementIds.includes(element.id ?? "") ||
    session.phase === "REVEAL";
  if (revealed) {
    return { type: "question", element, mode: "results", interactive: false };
  }

  // Still accepting answers. GAME holds on the prompt until the phase ends;
  // PRESENTATION may stream the tally live, but only when the showResponses
  // cascade explicitly lands on INSTANT (its default for PRESENTATION is
  // ON_CLICK, i.e. wait for the host). Questions have no per-element override,
  // so the cascade falls through to deck/session/format.
  const resolved = resolveShowResponsesFor(session, undefined, undefined);
  const live = session.format === "PRESENTATION" && resolved === "INSTANT";

  return {
    type: "question",
    element,
    mode: live ? "liveResults" : "prompt",
    interactive: HOST_CAN_PARTICIPATE || !viewerIsHost,
  };
};
