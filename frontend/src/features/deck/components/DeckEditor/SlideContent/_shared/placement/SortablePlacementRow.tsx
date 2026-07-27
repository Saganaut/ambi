/**
 * `PlacementItemRow` made reorderable by its grip — for editors whose row
 * order is itself meaningful (Axis's bank display order).
 *
 * Separate from `DraggablePlacementRow` because the rules of hooks forbid one
 * component switching between `useSortable` and `useDraggable` on a prop.
 */
import { useSortable } from "@dnd-kit/react/sortable";
import { Bars2Icon } from "@heroicons/react/24/outline";

import { PlacementItemRow, type PlacementItemRowProps } from "./PlacementItemRow";
import styles from "../_shared.module.css";

interface SortablePlacementRowProps
  extends Omit<PlacementItemRowProps, "grip" | "rootRef" | "dragging"> {
  /** Accessible name for the grip (e.g. "Reorder item 2"). */
  gripLabel: string;
}

const SortablePlacementRow = ({ gripLabel, ...rowProps }: SortablePlacementRowProps) => {
  const { ref, handleRef, isDragging } = useSortable({
    id: rowProps.item.id ?? "",
    index: rowProps.index,
  });

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

export { SortablePlacementRow };
