/**
 * Single-row editor for a Scales statement. A controlled row: the label mirror
 * (and, when the slide is scored, the target-value mirror) lives here while
 * structural ops (schedule / flush / remove) come in as props from the one
 * `useScalesEditor` in `ScalesSlideContent`, so every write funnels through a
 * single draft + debounce buffer.
 *
 * Statement order is display-only — each statement is keyed by id in the
 * content's `correctValues` — so rows are not drag-sortable (unlike Ranking,
 * where order is the answer).
 */
import { useState } from "react";

import { Input } from "@components/Forms/Input/Input/Input";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import type { ScaleItem } from "@deck/store/deckApi.gen";
import { ItemCard } from "../_shared";
import styles from "./ScalesSlideContent.module.css";

interface ScaleStatementEditableProps {
  statement: ScaleItem;
  sortIndex: number;
  canRemove: boolean;
  /** When true, the row shows a per-statement target-value input. */
  scored: boolean;
  /** The statement's target value, or undefined until the author sets one. */
  correctValue: number | undefined;
  /** Scale bounds, forwarded to the target input so it can't exceed the range. */
  min: number;
  max: number;
  step: number;
  onScheduleLabel: (next: ScaleItem) => void;
  onScheduleCorrectValue: (value: number) => void;
  onFlush: () => void;
  onRemove: () => void;
}

const ScaleStatementEditable = ({
  statement,
  sortIndex,
  canRemove,
  scored,
  correctValue,
  min,
  max,
  step,
  onScheduleLabel,
  onScheduleCorrectValue,
  onFlush,
  onRemove,
}: ScaleStatementEditableProps) => {
  // Fall back to the scale's midpoint so a freshly-scored statement lands on a
  // sensible in-range default rather than 0 / NaN.
  const midpoint = Math.round((min + max) / 2);

  const [label, setLabel] = useState(statement.label ?? "");
  const [target, setTarget] = useState(correctValue ?? midpoint);
  const [syncedFromId, setSyncedFromId] = useState(statement.id);
  const [syncedScored, setSyncedScored] = useState(scored);

  // Resync the local mirrors when this row is reused for a different statement
  // ("derive state during render" — safe when the value differs).
  if (syncedFromId !== statement.id) {
    setSyncedFromId(statement.id);
    setLabel(statement.label ?? "");
    setTarget(correctValue ?? midpoint);
  }

  // When scoring is re-enabled, refresh the target from the persisted value so a
  // stale number can't linger after `clearCorrectValues()` wiped the map while
  // this row stayed mounted — the map is empty again, so this falls back to the
  // midpoint rather than showing a target that is no longer saved.
  if (syncedScored !== scored) {
    setSyncedScored(scored);
    if (scored) setTarget(correctValue ?? midpoint);
  }

  const displayIndex = sortIndex + 1;

  return (
    <ItemCard
      index={sortIndex}
      removeLabel={`Remove statement ${displayIndex.toString()}`}
      removeDisabled={!canRemove}
      onRemove={onRemove}
    >
      <div className={styles.statementBody}>
        <Input
          type="text"
          fullWidth
          withPadding={false}
          value={label}
          placeholder={`Statement ${displayIndex.toString()}`}
          onChange={(e) => {
            const next = e.target.value;
            setLabel(next);
            onScheduleLabel({ ...statement, label: next });
          }}
          onBlur={onFlush}
        />
        {scored && (
          <div className={styles.targetField}>
            <NumberInput
              label="Answer"
              id={`scales-target-${statement.id ?? sortIndex.toString()}`}
              labelPosition="labelInFront"
              value={target}
              min={min}
              max={max}
              step={step}
              onChange={(next) => {
                setTarget(next);
                onScheduleCorrectValue(next);
              }}
              onBlur={onFlush}
            />
          </div>
        )}
      </div>
    </ItemCard>
  );
};

export { ScaleStatementEditable };
