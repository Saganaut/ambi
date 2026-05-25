/**
 * Single-row editor for an Allocation option. Each row owns its own
 * debounce timer via `useAllocationOptionEditor` so text edits never race
 * across rows, mirroring the MCQ per-option pattern (`McqOptionEditable`).
 *
 * The card body is a single text input. Bounds (canRemove) come from the
 * hook so the parent doesn't have to thread MIN/MAX through every row.
 */
import { useState } from "react";
import { Input } from "@/components/Common/Input/Input/Input";
import { ItemCard } from "../_shared";
import { useAllocationOptionEditor } from "../useElementEditor";

interface AllocationOptionEditableProps {
  optionId: string;
  /** Zero-based position — drives the index pill + remove-button label. */
  sortIndex: number;
}

const AllocationOptionEditable = ({
  optionId,
  sortIndex,
}: AllocationOptionEditableProps) => {
  const {
    option,
    schedule,
    flush,
    canRemove,
    remove,
    syncedFromId,
    markSynced,
  } = useAllocationOptionEditor(optionId);

  const [text, setText] = useState(option?.text ?? "");

  if (option && syncedFromId !== option.id) {
    markSynced(option.id);
    setText(option.text ?? "");
  }

  if (!option) return null;

  const displayIndex = sortIndex + 1;

  return (
    <ItemCard
      index={sortIndex}
      removeLabel={`Remove option ${displayIndex.toString()}`}
      removeDisabled={!canRemove}
      onRemove={remove}>
      <Input
        type='text'
        fullWidth
        value={text}
        placeholder={`Option ${displayIndex.toString()}`}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          schedule({ ...option, text: next });
        }}
        onBlur={flush}
      />
    </ItemCard>
  );
};

export { AllocationOptionEditable };
