/**
 * Single-row editor for a Ranking item. Owns its own debounce timer via
 * `useRankingItemEditor`. Authoring order doubles as the correct order until
 * drag-to-reorder ships (`correctOrder` is rebuilt by the parent hook on
 * every structural commit).
 */
import { useState } from "react";
import { Input } from "@components/Forms/Input/Input/Input";
import { ItemCard } from "../_shared";
import { useRankingItemEditor } from "../useElementEditor";

interface RankingItemEditableProps {
  itemId: string;
  sortIndex: number;
}

const RankingItemEditable = ({
  itemId,
  sortIndex,
}: RankingItemEditableProps) => {
  const { item, schedule, flush, canRemove, remove, syncedFromId, markSynced } =
    useRankingItemEditor(itemId);

  const [label, setLabel] = useState(item?.label ?? "");

  if (item && syncedFromId !== item.id) {
    markSynced(item.id);
    setLabel(item.label ?? "");
  }

  if (!item) return null;

  const displayIndex = sortIndex + 1;

  return (
    <ItemCard
      index={sortIndex}
      removeLabel={`Remove item ${displayIndex.toString()}`}
      removeDisabled={!canRemove}
      onRemove={remove}>
      <Input
        type='text'
        fullWidth
        value={label}
        placeholder={`Item ${displayIndex.toString()}`}
        onChange={(e) => {
          const next = e.target.value;
          setLabel(next);
          schedule({ ...item, label: next });
        }}
        onBlur={flush}
      />
    </ItemCard>
  );
};

export { RankingItemEditable };
