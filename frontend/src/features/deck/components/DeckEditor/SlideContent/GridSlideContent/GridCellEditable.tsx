/**
 * One matrix cell of the Grid editor: a drop target holding the chips of the
 * items whose `correctCells` entry points here, plus the place affordance —
 * an empty cell shows a full-size "Place here" button, a filled cell reveals a
 * compact "+" on hover/focus (kept in the tree so keyboard focus reaches it).
 * The button places the item armed in the "Items" column and is disabled while
 * nothing is armed, which is the pointer-free half of placement (dragging a
 * row's grip or another cell's chip onto this cell is the pointer half).
 *
 * The cell renders its children via a render prop so the composer keeps sole
 * ownership of item wiring; this component owns only the droppable frame.
 */
import { PlusIcon } from "@heroicons/react/24/solid";
import { useDroppable } from "@dnd-kit/react";
import type { ReactNode } from "react";

import styles from "./GridSlideContent.module.css";

interface GridCellEditableProps {
  /** The backend cell id ({@code "rowIndex,colIndex"}) — also the droppable id. */
  cell: string;
  /** Human cell name for accessible labels, e.g. "Forest × Carnivore". */
  cellName: string;
  hasItems: boolean;
  /** Display name of the armed item, or null when nothing is armed. */
  armedItemName: string | null;
  /** Place the armed item in this cell. */
  onPlaceArmed: () => void;
  children: ReactNode;
}

const GridCellEditable = ({
  cell,
  cellName,
  hasItems,
  armedItemName,
  onPlaceArmed,
  children,
}: GridCellEditableProps) => {
  const { ref, isDropTarget } = useDroppable({ id: cell });
  const armed = armedItemName != null;

  return (
    <div
      ref={ref}
      className={[styles.cell, isDropTarget ? styles.cellDropTarget : ""]
        .filter(Boolean)
        .join(" ")}
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
