/**
 * The "Items" column's rows as a drop target: a chip dragged off a cell and
 * onto this wrapper is unplaced (its `correctCells` entry is dropped), the
 * mirror of the live-session board's bank. Uses the reserved
 * {@link BANK_DROPPABLE_ID} sentinel, which cannot collide with a cell id
 * (always comma-bearing) or an item id (a UUID).
 *
 * Owns only the droppable frame and its drop highlight — the rows themselves
 * come in as children, so the composer keeps sole ownership of item wiring.
 */
import { useDroppable } from "@dnd-kit/react";
import type { ReactNode } from "react";

import { BANK_DROPPABLE_ID } from "@utils/dragDrop";
import styles from "./GridSlideContent.module.css";

interface GridItemBankProps {
  children: ReactNode;
}

const GridItemBank = ({ children }: GridItemBankProps) => {
  const { ref, isDropTarget } = useDroppable({ id: BANK_DROPPABLE_ID });

  return (
    <div
      ref={ref}
      className={[styles.bank, isDropTarget ? styles.bankDropTarget : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
};

export { GridItemBank };
