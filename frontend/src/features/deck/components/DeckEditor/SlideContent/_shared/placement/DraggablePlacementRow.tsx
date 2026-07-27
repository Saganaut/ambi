/**
 * `PlacementItemRow` made draggable by its grip — for editors that drop a row
 * onto a target rather than reordering the list (Grid's cells).
 *
 * `dragId` exists because an item can be draggable from two places at once
 * (Grid drags a row by its grip and the same item's placed chip), and dnd-kit
 * ids must be unique.
 */
import { useDraggable } from "@dnd-kit/react";
import { Bars2Icon } from "@heroicons/react/24/outline";

import { PlacementItemRow, type PlacementItemRowProps } from "./PlacementItemRow";
import styles from "../_shared.module.css";

interface DraggablePlacementRowProps
  extends Omit<PlacementItemRowProps, "grip" | "rootRef" | "dragging"> {
  /** Accessible name for the grip (e.g. "Drag item 2 onto a cell"). */
  gripLabel: string;
  /** dnd-kit id for this drag source; defaults to the item's own id. */
  dragId?: string;
}

const DraggablePlacementRow = ({
  gripLabel,
  dragId,
  ...rowProps
}: DraggablePlacementRowProps) => {
  const { ref, handleRef, isDragging } = useDraggable({ id: dragId ?? rowProps.item.id ?? "" });

  return (
    <PlacementItemRow
      {...rowProps}
      rootRef={ref}
      dragging={isDragging}
      grip={
        <span ref={handleRef} className={styles.dragHandle} role="button" aria-label={gripLabel}>
          <Bars2Icon className={styles.dragHandleIcon} aria-hidden="true" />
        </span>
      }
    />
  );
};

export { DraggablePlacementRow };
