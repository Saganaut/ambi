// The unplaced-item bank every drag-to-place board puts under its surface: the
// row of chips still to place, and a drop target that un-places a chip dragged
// back onto it (the reserved `BANK_DROPPABLE_ID` sentinel, which can collide
// with neither an item id — a backend UUID — nor a cell id, which always
// carries a comma).
//
// The chips themselves stay the board's: their accent, badge and accessible
// naming genuinely differ per board, so they come in as children. What is the
// same everywhere — the row, the drop highlight, and the two hint lines that
// bracket it — lives here. Only the hints' wording is the caller's, since it
// names that board's surface ("tap the plane", "tap a cell").
//
// Pure view: it holds no state and derives "empty" from the children it was
// handed, so a board keeps its one-line bank derivation and never has to
// branch on it.
import { useDroppable } from "@dnd-kit/react";
import { Children, type ReactNode } from "react";

import { BANK_DROPPABLE_ID } from "@utils/dragDrop";
import styles from "./BoardBank.module.css";

interface BoardBankProps {
  /** Disables the drop target outside the answerable moments. */
  dropDisabled: boolean;
  /** Line shown in place of the chips once every item has been placed. */
  emptyHint?: string;
  /** Line shown under the chips while an item is held; `null` shows none. */
  heldHint?: string | null;
  /** The board's own bank chips — an empty list is what "empty" means here. */
  children: ReactNode;
}

const BoardBank = ({ dropDisabled, emptyHint, heldHint, children }: BoardBankProps) => {
  const { ref, isDropTarget } = useDroppable({
    id: BANK_DROPPABLE_ID,
    disabled: dropDisabled,
  });
  const isEmpty = Children.count(children) === 0;
  return (
    <div
      ref={ref}
      className={[styles.bank, isDropTarget ? styles.bankDropTarget : ""].filter(Boolean).join(" ")}
    >
      {isEmpty && emptyHint ? <span className={styles.hint}>{emptyHint}</span> : children}
      {heldHint ? <span className={styles.hint}>{heldHint}</span> : null}
    </div>
  );
};

export { BoardBank };
export type { BoardBankProps };
