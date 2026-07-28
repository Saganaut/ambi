/**
 * One matrix cell of the Grid editor: the chips of the items whose
 * `correctCells` entry points here, plus the place affordance — an empty cell
 * shows a full-size "Place here" button, a filled cell reveals a compact "+" on
 * hover/focus (kept in the tree so keyboard focus reaches it). The button places
 * the item armed in the "Items" column and is disabled while nothing is armed,
 * which is the pointer-free half of placement (pressing on the matrix and
 * releasing over this cell is the pointer half).
 *
 * The cell does not handle pointers itself: it registers its element through
 * `cellRef` so the matrix's placement gesture can hit-test against its box, and
 * takes `hovered` from that gesture. Its children come in through the parent so
 * the composer keeps sole ownership of item wiring.
 */
import { PlusIcon } from "@heroicons/react/24/solid";
import type { ReactNode, Ref } from "react";

import styles from "./GridSlideContent.module.css";

interface GridCellEditableProps {
  /** Human cell name for accessible labels, e.g. "Forest × Carnivore". */
  cellName: string;
  hasItems: boolean;
  /** Display name of the armed item, or null when nothing is armed. */
  armedItemName: string | null;
  /** True while a placement gesture's pointer is over this cell. */
  hovered: boolean;
  /** Registers the cell's box with the matrix's placement gesture. */
  cellRef: Ref<HTMLDivElement>;
  /** Place the armed item in this cell. */
  onPlaceArmed: () => void;
  children: ReactNode;
}

const GridCellEditable = ({
  cellName,
  hasItems,
  armedItemName,
  hovered,
  cellRef,
  onPlaceArmed,
  children,
}: GridCellEditableProps) => {
  const armed = armedItemName != null;

  return (
    <div
      ref={cellRef}
      className={[styles.cell, hovered ? styles.cellHovered : ""].filter(Boolean).join(" ")}
    >
      {children}
      <button
        type="button"
        className={hasItems ? styles.cellAddCompact : styles.cellAddEmpty}
        aria-label={`Place ${armedItemName ?? "an item"} in ${cellName}`}
        disabled={!armed}
        onClick={onPlaceArmed}
      >
        {/* In an empty cell the "+" reads as an invitation, so it gives way to
            the hint while nothing is armed; in a filled cell it IS the button. */}
        {(armed || hasItems) && <PlusIcon className={styles.cellAddIcon} aria-hidden="true" />}
        {!hasItems && <span>{armed ? "Place here" : "Select an item to place"}</span>}
      </button>
    </div>
  );
};

export { GridCellEditable };
