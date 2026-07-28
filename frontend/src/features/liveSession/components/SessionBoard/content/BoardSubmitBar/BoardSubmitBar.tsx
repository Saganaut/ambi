// The submit affordance every answerable board ends with: the brand button that
// posts the round answer, and the success-colored line confirming a posted one.
// Boards differed only in wording and in whether a submitted answer can still be
// changed, yet each spelled the confirmation line with its own class name for
// the same three declarations — that duplication is what this component ends.
//
// Two shapes, chosen by whether `resubmitLabel` is given:
//   - re-submittable (label present) → the note appears BESIDE a button that
//     stays live and switches to `resubmitLabel`;
//   - one-shot (label absent)       → the note REPLACES the button and anything
//     passed as `children`, because the answer can no longer be changed.
//
// Deliberately not here: the surrounding `.actions` wrapper and the gating that
// decides whether the bar is rendered at all. Those differ per board (column vs
// row, `interactive && mode !== "results"` vs `canMatch` vs `mode === "prompt"`)
// and a board that hides more than the button on submit — its chip bank, say —
// keeps that conditional itself. Pure view: no state, no store, no fetching.
import type { ReactNode } from "react";

import { Btn } from "@ui/Buttons/Btn";

import styles from "./BoardSubmitBar.module.css";

interface BoardSubmitBarProps {
  /** Whether the viewer has already posted an answer this round. */
  submitted: boolean;
  /** Whether the answer is incomplete, so the button can't be pressed yet. */
  disabled: boolean;
  /** Posts the current answer. */
  onSubmit: () => void;
  /** Button label before the first submit — e.g. "Submit answer". */
  idleLabel: string;
  /**
   * Button label once submitted — e.g. "Update answer". Omit for a one-shot
   * board, where a submitted answer is final and the note takes the button's
   * place instead.
   */
  resubmitLabel?: string;
  /** The line confirming a posted answer — e.g. "Answer locked in ✓". */
  submittedNote: string;
  /**
   * Board-specific extras rendered just before the button — a hint, a chip
   * bank. Dropped along with the button when a one-shot board is submitted.
   */
  children?: ReactNode;
}

const BoardSubmitBar = ({
  submitted,
  disabled,
  onSubmit,
  idleLabel,
  resubmitLabel,
  submittedNote,
  children,
}: BoardSubmitBarProps) => {
  const note = <p className={styles.note}>{submittedNote}</p>;

  if (resubmitLabel === undefined) {
    if (submitted) return note;
    return (
      <>
        {children}
        <Btn size='sm' variant='brand' disabled={disabled} onClick={onSubmit}>
          {idleLabel}
        </Btn>
      </>
    );
  }

  return (
    <>
      {submitted && note}
      {children}
      <Btn size='sm' variant='brand' disabled={disabled} onClick={onSubmit}>
        {submitted ? resubmitLabel : idleLabel}
      </Btn>
    </>
  );
};

export { BoardSubmitBar };
export type { BoardSubmitBarProps };
