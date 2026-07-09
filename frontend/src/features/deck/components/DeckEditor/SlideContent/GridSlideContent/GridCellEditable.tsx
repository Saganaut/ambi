/**
 * One matrix cell of the Grid editor: a drop target holding the item cards
 * whose `correctCells` entry points here, plus the add affordance — an empty
 * cell shows a full-size "Add item" button, a filled cell reveals a compact
 * "+" on hover/focus (kept in the tree so keyboard focus reaches it). The
 * cell renders its children via a render prop so the composer keeps sole
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
  canAddItem: boolean;
  onAddItem: () => void;
  children: ReactNode;
}

const GridCellEditable = ({
  cell,
  cellName,
  hasItems,
  canAddItem,
  onAddItem,
  children,
}: GridCellEditableProps) => {
  const { ref, isDropTarget } = useDroppable({ id: cell });

  return (
    <div
      ref={ref}
      className={[styles.cell, isDropTarget ? styles.cellDropTarget : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
      {canAddItem && (
        <button
          type="button"
          className={hasItems ? styles.cellAddCompact : styles.cellAddEmpty}
          aria-label={`Add item to ${cellName}`}
          onClick={onAddItem}
        >
          <PlusIcon className={styles.cellAddIcon} aria-hidden="true" />
          {!hasItems && <span>Add item</span>}
        </button>
      )}
    </div>
  );
};

export { GridCellEditable };
