/**
 * Single-row editor for a Ranking item. A controlled row: the label mirror
 * lives here while structural ops (schedule / flush / remove) come in as props
 * from the one `useRankingEditor` in `RankingSlideContent`, so every write
 * funnels through a single draft + debounce buffer.
 *
 * The row is drag-sortable via a dedicated grip handle (`handleRef`) rather than
 * the whole card, so dragging to reorder never fights with typing into the
 * label input. Authoring order is the correct order, so a drop rewrites
 * `correctOrder` upstream in the parent hook.
 */
import { Bars2Icon } from "@heroicons/react/24/outline";
import { useSortable } from "@dnd-kit/react/sortable";
import { useState } from "react";

import { Input } from "@components/Forms/Input/Input/Input";
import type { RankItem } from "@deck/store/deckApi.gen";
import { ItemCard } from "../_shared";
import styles from "./RankingSlideContent.module.css";

interface RankingItemEditableProps {
  item: RankItem;
  sortIndex: number;
  canRemove: boolean;
  onScheduleLabel: (next: RankItem) => void;
  onFlush: () => void;
  onRemove: () => void;
}

const RankingItemEditable = ({
  item,
  sortIndex,
  canRemove,
  onScheduleLabel,
  onFlush,
  onRemove,
}: RankingItemEditableProps) => {
  const itemId = item.id ?? "";
  const { ref, handleRef, isDragging } = useSortable({ id: itemId, index: sortIndex });

  const [label, setLabel] = useState(item.label ?? "");
  const [syncedFromId, setSyncedFromId] = useState(item.id);

  // Resync the local mirror when this row is reused for a different item
  // ("derive state during render" — safe when the value differs).
  if (syncedFromId !== item.id) {
    setSyncedFromId(item.id);
    setLabel(item.label ?? "");
  }

  const displayIndex = sortIndex + 1;

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
            role="button"
            aria-label={`Reorder item ${displayIndex.toString()}`}
          >
            <Bars2Icon className={styles.dragHandleIcon} />
          </span>
        }
      >
        <Input
          type="text"
          fullWidth
          withPadding={false}
          value={label}
          placeholder={`Item ${displayIndex.toString()}`}
          onChange={(e) => {
            const next = e.target.value;
            setLabel(next);
            onScheduleLabel({ ...item, label: next });
          }}
          onBlur={onFlush}
        />
      </ItemCard>
    </div>
  );
};

export { RankingItemEditable };
