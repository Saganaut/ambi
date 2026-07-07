/**
 * Single-row editor for a Grid item: the label plus the target-cell dropdown
 * (`correctCells[itemId]`). A controlled row like `RankingItemEditable`: the
 * label mirror lives here while structural ops (schedule / flush / remove /
 * set-target) come in as props from the one `useGridEditor` in
 * `GridSlideContent`. Drag-sortable by the grip handle to reorder the bank's
 * display order (placement targets are id-keyed, so order never affects them).
 */
import { Bars2Icon } from "@heroicons/react/24/outline";
import { useSortable } from "@dnd-kit/react/sortable";
import { useState } from "react";

import { Dropdown } from "@components/Forms/Input/Dropdown/Dropdown";
import { Input } from "@components/Forms/Input/Input/Input";
import { cellId } from "@deck/hooks/useGridEditor";
import type { GridItem } from "@deck/store/deckApi.gen";
import { ItemCard } from "../_shared";
import styles from "./GridSlideContent.module.css";

/** Dropdown sentinel for "no target assigned". */
const NO_TARGET = "none";

interface GridItemEditableProps {
  item: GridItem;
  sortIndex: number;
  rowLabels: string[];
  colLabels: string[];
  /** The item's assigned cell id ({@code "row,col"}), or null when unassigned. */
  targetCell: string | null;
  canRemove: boolean;
  onScheduleLabel: (label: string) => void;
  onFlush: () => void;
  onSetTarget: (cell: string | null) => void;
  onRemove: () => void;
}

const GridItemEditable = ({
  item,
  sortIndex,
  rowLabels,
  colLabels,
  targetCell,
  canRemove,
  onScheduleLabel,
  onFlush,
  onSetTarget,
  onRemove,
}: GridItemEditableProps) => {
  const itemId = item.id ?? "";
  const { ref, handleRef, isDragging } = useSortable({ id: itemId, index: sortIndex });

  const [label, setLabel] = useState(item.label ?? "");
  const [syncedFromId, setSyncedFromId] = useState(item.id);
  if (syncedFromId !== item.id) {
    setSyncedFromId(item.id);
    setLabel(item.label ?? "");
  }

  const displayIndex = sortIndex + 1;

  const cellOptions = [
    { value: NO_TARGET, label: "No target cell" },
    ...rowLabels.flatMap((rowLabel, row) =>
      colLabels.map((colLabel, col) => ({
        value: cellId(row, col),
        label: `${rowLabel.trim() || `Row ${(row + 1).toString()}`} × ${
          colLabel.trim() || `Column ${(col + 1).toString()}`
        }`,
      })),
    ),
  ];

  return (
    <div ref={ref} className={isDragging ? styles.dragging : undefined}>
      <ItemCard
        index={sortIndex}
        removeLabel={`Remove item ${displayIndex.toString()}`}
        removeDisabled={!canRemove}
        onRemove={onRemove}
        actions={
          <span
            ref={handleRef}
            className={styles.dragHandle}
            role='button'
            aria-label={`Reorder item ${displayIndex.toString()}`}>
            <Bars2Icon className={styles.dragHandleIcon} />
          </span>
        }>
        <div className={styles.itemFields}>
          <Input
            type='text'
            fullWidth
            withPadding={false}
            value={label}
            placeholder={`Item ${displayIndex.toString()}`}
            onChange={(event) => {
              const next = event.target.value;
              setLabel(next);
              onScheduleLabel(next);
            }}
            onBlur={onFlush}
          />
          <Dropdown
            compact
            id={`grid-target-${itemId}`}
            label='Target cell'
            labelPosition='labelInFront'
            options={cellOptions}
            value={[targetCell ?? NO_TARGET]}
            onChange={(values) => {
              const next = values[0];
              onSetTarget(next == null || next === NO_TARGET ? null : next);
            }}
          />
        </div>
      </ItemCard>
    </div>
  );
};

export { GridItemEditable };
