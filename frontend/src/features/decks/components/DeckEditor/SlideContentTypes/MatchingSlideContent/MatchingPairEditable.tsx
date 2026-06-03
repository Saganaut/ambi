/**
 * Single-row editor for a Matching pair. Owns its own debounce timer via
 * `useMatchingPairEditor` so left/right edits never race a sibling pair's
 * pending commit, mirroring the MCQ per-option pattern.
 *
 * The body is a left ↔ right input grid; the answer-key invariant
 * (authoring order = correct mapping) is preserved by the parent reading
 * `pairs` straight from the cache via `useMatchingEditor.items`.
 */
import { useState } from "react";
import { Input } from "@components/Forms/Input/Input/Input";
import { ItemCard } from "../_shared";
import { useMatchingPairEditor } from "../useElementEditor";
import styles from "./MatchingSlideContent.module.css";

interface MatchingPairEditableProps {
  pairId: string;
  sortIndex: number;
}

const MatchingPairEditable = ({
  pairId,
  sortIndex,
}: MatchingPairEditableProps) => {
  const { pair, schedule, flush, canRemove, remove, syncedFromId, markSynced } =
    useMatchingPairEditor(pairId);

  const [leftLabel, setLeftLabel] = useState(pair?.leftLabel ?? "");
  const [rightLabel, setRightLabel] = useState(pair?.rightLabel ?? "");

  if (pair && syncedFromId !== pair.id) {
    markSynced(pair.id);
    setLeftLabel(pair.leftLabel ?? "");
    setRightLabel(pair.rightLabel ?? "");
  }

  if (!pair) return null;

  const displayIndex = sortIndex + 1;

  return (
    <ItemCard
      index={sortIndex}
      removeLabel={`Remove pair ${displayIndex.toString()}`}
      removeDisabled={!canRemove}
      onRemove={remove}>
      <div className={styles.pairFields}>
        <Input
          type='text'
          fullWidth
          value={leftLabel}
          placeholder={`Left ${displayIndex.toString()}`}
          onChange={(e) => {
            const next = e.target.value;
            setLeftLabel(next);
            schedule({ ...pair, leftLabel: next });
          }}
          onBlur={flush}
        />
        <span className={styles.pairArrow} aria-hidden='true'>
          ↔
        </span>
        <Input
          type='text'
          fullWidth
          value={rightLabel}
          placeholder={`Right ${displayIndex.toString()}`}
          onChange={(e) => {
            const next = e.target.value;
            setRightLabel(next);
            schedule({ ...pair, rightLabel: next });
          }}
          onBlur={flush}
        />
      </div>
    </ItemCard>
  );
};

export { MatchingPairEditable };
