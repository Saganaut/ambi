/**
 * VOTE-phase picker for Best Answer rounds. Renders the anonymized
 * submissions as a list of clickable cards; once the player clicks one we
 * send the vote and lock all cards.
 *
 * Submissions are anonymized server-side (no userId) — the de-anonymized
 * tally arrives later as part of the round result.
 */
import { Btn } from "@/components/Common/Buttons/Btn";
import { DrawingPreview } from "../DrawingReveal/DrawingReveal";
import type { AnswerPayload, DeckElement } from "../../../types/elements";
import type { AnonymizedSubmission } from "../../../types/bestAnswer";
import styles from "./VotePanel.module.css";

interface VotePanelProps {
  element: DeckElement;
  submissions: AnonymizedSubmission[];
  myVote: string | null;
  totalPlayers: number;
  votedCount: number;
  timeRemaining: number;
  unlimited: boolean;
  onVote: (submissionId: string) => void;
}

const VotePanel = ({
  element,
  submissions,
  myVote,
  totalPlayers,
  votedCount,
  timeRemaining,
  unlimited,
  onVote,
}: VotePanelProps) => {
  const disabled = myVote !== null;

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <h3 className={styles.title}>Vote for the best answer</h3>
        <div className={styles.meta}>
          <span className={styles.progress}>
            {votedCount} / {totalPlayers} voted
          </span>
          {!unlimited && (
            <span className={styles.timer}>{timeRemaining}s</span>
          )}
        </div>
      </header>

      {submissions.length === 0 ? (
        <p className={styles.empty}>No submissions to vote on.</p>
      ) : isDrawingPanel(element) ? (
        <ul className={styles.drawingGrid}>
          {submissions.map((s) => {
            const isMine = myVote === s.submissionId;
            const strokes =
              s.payload.kind === "DrawingAnswer"
                ? (s.payload.strokes ?? [])
                : [];
            return (
              <li key={s.submissionId}>
                <button
                  type='button'
                  disabled={disabled}
                  onClick={() => {
                    onVote(s.submissionId);
                  }}
                  aria-label='Vote for this drawing'
                  className={`${styles.drawingCard} ${isMine ? styles.cardSelected : ""}`}>
                  <DrawingPreview
                    element={element}
                    strokes={strokes}
                    pixelWidth={320}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className={styles.list}>
          {submissions.map((s) => {
            const isMine = myVote === s.submissionId;
            return (
              <li key={s.submissionId}>
                <Btn
                  type='button'
                  disabled={disabled}
                  onClick={() => {
                    onVote(s.submissionId);
                  }}
                  className={`${styles.card} ${isMine ? styles.cardSelected : ""}`}>
                  <span className={styles.submissionText}>
                    {renderSubmission(element, s.payload)}
                  </span>
                </Btn>
              </li>
            );
          })}
        </ul>
      )}

      {disabled && (
        <p className={styles.locked}>
          Vote locked in — waiting for the rest of the room.
        </p>
      )}
    </div>
  );
};

/**
 * Type guard for the Drawing element kind. When true the vote grid switches
 * from inline text cards to a thumbnail grid of mini canvases — text doesn't
 * carry enough signal to vote on a sketch.
 */
const isDrawingPanel = (
  element: DeckElement,
): element is Extract<DeckElement, { kind: "DrawingQuestion" }> =>
  element.kind === "DrawingQuestion";

/**
 * Formats an anonymized submission for display. For MCQ we look up the option
 * text on the (still-redacted) element so voters see a real answer rather than
 * an opaque option id.
 */
const renderSubmission = (
  element: DeckElement,
  payload: AnswerPayload,
): string => {
  switch (payload.kind) {
    case "TextAnswer":
      return payload.text ?? "(blank)";
    case "NumberAnswer":
      return payload.value !== undefined ? String(payload.value) : "(blank)";
    case "McqAnswer": {
      const oid = payload.optionIds?.[0];
      if (element.kind === "McqQuestion") {
        const opt = element.options?.find((o) => o.id === oid);
        return opt?.text ?? oid ?? "(unknown)";
      }
      return oid ?? "(unknown)";
    }
    case "TimeoutAnswer":
      return "(timed out)";
    default:
      return `(${payload.kind})`;
  }
};

export { VotePanel };
