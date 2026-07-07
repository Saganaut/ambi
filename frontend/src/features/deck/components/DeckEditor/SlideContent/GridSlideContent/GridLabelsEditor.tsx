/**
 * One matrix axis (the row or column labels) of the Grid editor: a compact
 * stack of label inputs with per-row remove and an add affordance, capped at
 * the axis limits. Labels are index-keyed in content, so the whole list is
 * mirrored locally and resynced on slide change or on a structural change made
 * elsewhere (add/remove alters the length).
 */
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import { Input } from "@components/Forms/Input/Input/Input";
import {
  MAX_GRID_DIMENSION,
  type GridAxis,
  type UseGridEditorResult,
} from "@deck/hooks/useGridEditor";
import styles from "./GridSlideContent.module.css";

interface GridLabelsEditorProps {
  axis: GridAxis;
  title: string;
  editor: UseGridEditorResult;
  /** The active slide id — the local mirror's resync key. */
  slideId: string;
}

const GridLabelsEditor = ({ axis, title, editor, slideId }: GridLabelsEditorProps) => {
  const labels =
    (axis === "row" ? editor.question?.rowLabels : editor.question?.colLabels) ?? [];

  const [draft, setDraft] = useState<string[]>(labels);
  const [syncedFrom, setSyncedFrom] = useState(slideId);
  // Resync on slide change or when a structural edit (add/remove) changed the
  // list shape under us ("derive state during render").
  if (syncedFrom !== slideId || draft.length !== labels.length) {
    setSyncedFrom(slideId);
    setDraft(labels);
  }

  const axisName = axis === "row" ? "Row" : "Column";

  return (
    <div className={styles.labelsEditor}>
      <h5 className={styles.labelsTitle}>{title}</h5>
      {draft.map((label, index) => (
        <div key={`${axis}-${index.toString()}`} className={styles.labelRow}>
          <Input
            type='text'
            fullWidth
            withPadding={false}
            ariaLabel={`${axisName} ${(index + 1).toString()} label`}
            value={label}
            placeholder={`${axisName} ${(index + 1).toString()}`}
            onChange={(event) => {
              const next = event.target.value;
              setDraft((prev) => prev.map((l, i) => (i === index ? next : l)));
              editor.scheduleLabel(axis, index, next);
            }}
            onBlur={editor.flush}
          />
          <button
            type='button'
            className={styles.labelRemove}
            aria-label={`Remove ${axisName.toLowerCase()} ${(index + 1).toString()}`}
            disabled={!editor.canRemoveLabel(axis)}
            onClick={() => {
              editor.removeLabel(axis, index);
            }}>
            <XMarkIcon className={styles.labelRemoveIcon} aria-hidden='true' />
          </button>
        </div>
      ))}
      <button
        type='button'
        className={styles.labelAdd}
        disabled={!editor.canAddLabel(axis)}
        onClick={() => {
          editor.addLabel(axis);
        }}>
        {editor.canAddLabel(axis)
          ? `Add ${axisName.toLowerCase()}`
          : `Maximum ${MAX_GRID_DIMENSION.toString()}`}
      </button>
    </div>
  );
};

export { GridLabelsEditor };
