/**
 * The one lookup every scored board needs from a revealed round: which of the
 * result's per-participant outcomes is the viewer's own. Pure and slide-scoped —
 * a result still carrying the PREVIOUS round (the slice keeps the last reveal
 * until the next one lands) yields nothing, so a board never banners a stale
 * verdict onto a fresh question.
 *
 * Deliberately not mode-aware: boards gate on their own moment (and on whether
 * the round is scored at all) before asking, and the Number board asks with a
 * result it has already narrowed itself.
 */
import type { ParticipantOutcome } from "../../../store/liveSessionEvents";
import type { RoundResults } from "../../../store/liveSessionSlice";

/**
 * The viewer's outcome within {@link results}, or `undefined` when the result is
 * absent, belongs to another slide, or holds no row for this viewer (they never
 * answered).
 */
const findViewerOutcome = (
  results: RoundResults | null | undefined,
  slideId: string,
  viewerParticipantId: string | null,
): ParticipantOutcome | undefined =>
  results?.slideId === slideId
    ? results.outcomes.find((outcome) => outcome.participantId === viewerParticipantId)
    : undefined;

export { findViewerOutcome };
