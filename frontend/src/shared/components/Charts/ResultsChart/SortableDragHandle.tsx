// A drag handle that makes its option sortable for reorder. ResultsChart hands
// each chart one of these per option; the chart places the grip wherever its
// layout wants it. The handle element itself is the @dnd-kit sortable node, so
// grabbing it starts the drag; on drop the slide's option order updates and the
// chart re-renders in the new order. `index` is the option's position in the
// slide's option list (not the chart's display order), so the drop maps to the
// right option.
import { useSortable } from "@dnd-kit/react/sortable";
import styles from "./SortableDragHandle.module.css";

interface SortableDragHandleProps {
  /** Stable per-option id so DragDropProvider can identify the source on drop. */
  id: string;
  /** Position in the slide's option list. */
  index: number;
}

const SortableDragHandle = ({ id, index }: SortableDragHandleProps) => {
  const { ref, handleRef, isDragging } = useSortable({ id, index });

  // The grip is both the sortable element (`ref`) and the drag handle
  // (`handleRef`). Registering it as the handle is what gives the pointer sensor
  // its immediate-activation fast path for mouse drags — without it, dragging
  // falls back to a hold-to-start delay and feels unresponsive on a small grip.
  const setRef = (node: HTMLButtonElement | null) => {
    ref(node);
    handleRef(node);
  };

  return (
    <button
      ref={setRef}
      type="button"
      className={`${styles.handle} ${isDragging ? styles.dragging : ""}`}
      aria-label="Drag to reorder option"
    >
      <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
        <circle cx="2.5" cy="3" r="1.2" />
        <circle cx="7.5" cy="3" r="1.2" />
        <circle cx="2.5" cy="8" r="1.2" />
        <circle cx="7.5" cy="8" r="1.2" />
        <circle cx="2.5" cy="13" r="1.2" />
        <circle cx="7.5" cy="13" r="1.2" />
      </svg>
    </button>
  );
};

export { SortableDragHandle };
