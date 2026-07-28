/**
 * One editable matrix-axis label of the Grid editor — the column header or
 * row label pill, edited in place. Hovering (or focusing into) the pill
 * reveals an × that deletes the whole column/row; the button stays in the
 * tree (revealed by CSS) so keyboard focus reaches it. The label mirror
 * lives here; the parent remounts the component (via its `key`) on slide
 * change or a structural edit, so no explicit resync is needed.
 */
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import type { GridAxis } from "@deck/hooks/useGridEditor";
import styles from "./GridSlideContent.module.css";

interface GridAxisLabelProps {
  axis: GridAxis;
  /** 0-based position on its axis, for placeholders and accessible names. */
  index: number;
  value: string;
  canRemove: boolean;
  /** Debounced label text edit. */
  onScheduleLabel: (label: string) => void;
  onFlush: () => void;
  /** Delete this whole column/row (targets in it are dropped/reindexed). */
  onRemove: () => void;
}

const GridAxisLabel = ({
  axis,
  index,
  value,
  canRemove,
  onScheduleLabel,
  onFlush,
  onRemove,
}: GridAxisLabelProps) => {
  const [label, setLabel] = useState(value);
  const axisName = axis === "row" ? "Row" : "Column";
  const position = (index + 1).toString();

  return (
    // The pill sits inside the matrix, so a press on it must not fall through
    // and start a placement gesture underneath.
    <div
      className={[styles.axisLabel, axis === "col" ? styles.axisLabelCol : ""]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      <input
        type="text"
        className={styles.axisLabelInput}
        aria-label={`${axisName} ${position} label`}
        value={label}
        placeholder={`${axisName} ${position}`}
        onChange={(event) => {
          const next = event.target.value;
          setLabel(next);
          onScheduleLabel(next);
        }}
        onBlur={onFlush}
      />
      {canRemove && (
        <button
          type="button"
          className={styles.axisLabelRemove}
          aria-label={`Delete ${axisName.toLowerCase()} ${position}`}
          onClick={onRemove}
        >
          <XMarkIcon className={styles.axisLabelRemoveIcon} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export { GridAxisLabel };
