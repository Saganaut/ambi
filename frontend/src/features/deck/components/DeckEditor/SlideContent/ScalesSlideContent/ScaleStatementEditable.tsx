/**
 * Single-row editor for a Scales statement: the label input plus the
 * statement's own copy of the scale, rendered as tappable points flanked by
 * the anchor labels. Tapping a point sets that statement's correct answer
 * (committed immediately — no debounce, it's a discrete intent); tapping the
 * selected point clears it, leaving the statement unscored. A scored
 * statement gets a success-tinted outline via `ItemCard`'s `tone`.
 *
 * When the range can't render as dots (no positive step, or too many ticks —
 * see `scaleTicks`), or the persisted target no longer lands on a tick (the
 * author changed min/max/step after scoring), the row falls back to a numeric
 * "Answer" field with an explicit set/clear affordance so the value stays
 * visible and clearable instead of silently orphaned.
 *
 * A controlled row: the label mirror (and the fallback target mirror) lives
 * here while structural ops (schedule / commit / clear / flush / remove) come
 * in as props from the one `useScalesEditor` in `ScalesSlideContent`, so every
 * write funnels through a single draft + debounce buffer.
 *
 * Statement order is display-only — each statement is keyed by id in the
 * content's `correctValues` — so rows are not drag-sortable (unlike Ranking,
 * where order is the answer).
 */
import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { Input } from "@components/Forms/Input/Input/Input";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import type { ScaleItem } from "@deck/store/deckApi.gen";
import { Btn } from "@ui/Buttons/Btn";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { ItemCard } from "../_shared";
import { scaleTicks } from "./scaleTicks";
import styles from "./ScalesSlideContent.module.css";

interface ScaleStatementEditableProps {
  statement: ScaleItem;
  sortIndex: number;
  canRemove: boolean;
  /** The statement's correct answer, or undefined while it is unscored. */
  correctValue: number | undefined;
  /** Scale definition — drives the tappable points and the fallback bounds. */
  min: number;
  max: number;
  step: number;
  /** Anchor labels echoed beside the statement's scale. */
  leftLabel: string;
  rightLabel: string;
  onScheduleLabel: (next: ScaleItem) => void;
  /** Immediate target set (a point tap or "Set answer"). */
  onCommitCorrectValue: (value: number) => void;
  /** Debounced target edit from the fallback numeric field. */
  onScheduleCorrectValue: (value: number) => void;
  onClearCorrectValue: () => void;
  onFlush: () => void;
  onRemove: () => void;
}

const ScaleStatementEditable = ({
  statement,
  sortIndex,
  canRemove,
  correctValue,
  min,
  max,
  step,
  leftLabel,
  rightLabel,
  onScheduleLabel,
  onCommitCorrectValue,
  onScheduleCorrectValue,
  onClearCorrectValue,
  onFlush,
  onRemove,
}: ScaleStatementEditableProps) => {
  const ticks = scaleTicks(min, max, step);
  const scored = correctValue !== undefined;
  // A target set before a min/max/step edit may no longer land on a tick; the
  // dot track can't show (or clear) it, so such rows use the numeric fallback.
  const onTrack = correctValue === undefined || ticks.includes(correctValue);
  // The fallback "Set answer" lands on the scale's midpoint so a freshly-scored
  // statement starts on a sensible in-range default rather than 0 / NaN.
  const midpoint = Math.round((min + max) / 2);

  const [label, setLabel] = useState(statement.label ?? "");
  // Local mirror for the fallback numeric field only — dot taps commit
  // immediately and read straight from `correctValue`.
  const [target, setTarget] = useState(correctValue ?? midpoint);
  const [syncedFromId, setSyncedFromId] = useState(statement.id);

  // Resync the local mirrors when this row is reused for a different statement
  // ("derive state during render" — safe when the value differs).
  if (syncedFromId !== statement.id) {
    setSyncedFromId(statement.id);
    setLabel(statement.label ?? "");
    setTarget(correctValue ?? midpoint);
  }

  const displayIndex = sortIndex + 1;

  return (
    <ItemCard
      index={sortIndex}
      tone={scored ? "success" : undefined}
      removeLabel={`Remove statement ${displayIndex.toString()}`}
      removeDisabled={!canRemove}
      onRemove={onRemove}>
      <div className={styles.statementBody}>
        <Input
          type='text'
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
        {ticks.length > 0 && onTrack ? (
          <div className={styles.statementScale}>
            <span className={styles.anchorCaption}>
              {leftLabel.length > 0 ? leftLabel : min}
            </span>
            <div
              className={styles.targetTrack}
              role='group'
              aria-label={`Correct answer for statement ${displayIndex.toString()}`}>
              <div className={styles.targetLine} />
              {ticks.map((value) => {
                const selected = value === correctValue;
                return (
                  <button
                    key={value}
                    type='button'
                    className={[
                      styles.targetDot,
                      selected ? styles.targetDotSelected : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-pressed={selected}
                    aria-label={
                      selected
                        ? `Clear correct answer ${value.toString()}`
                        : `Set correct answer to ${value.toString()}`
                    }
                    onClick={() => {
                      if (selected) onClearCorrectValue();
                      else onCommitCorrectValue(value);
                    }}
                  />
                );
              })}
            </div>
            <span className={styles.anchorCaption}>
              {rightLabel.length > 0 ? rightLabel : max}
            </span>
          </div>
        ) : scored ? (
          <div className={styles.targetField}>
            <NumberInput
              label='Answer'
              id={`scales-target-${statement.id ?? sortIndex.toString()}`}
              labelPosition='labelInFront'
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
            <IconBtn
              fill='ghost'
              size='xs'
              icon={<XMarkIcon />}
              aria-label={`Clear correct answer for statement ${displayIndex.toString()}`}
              onClick={onClearCorrectValue}
            />
          </div>
        ) : (
          <Btn
            fill='ghost'
            size='xs'
            onClick={() => {
              setTarget(midpoint);
              onCommitCorrectValue(midpoint);
            }}>
            Set answer
          </Btn>
        )}
      </div>
    </ItemCard>
  );
};

export { ScaleStatementEditable };
