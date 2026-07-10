/**
 * Single-row editor for an Allocation option: the palette-colored index
 * badge, the label field with its popover menu (the shared `ItemField` —
 * focus-opened: palette/custom color, image, delete), an image thumbnail
 * when one is set, and the option's share of the answer key. A scored option
 * shows a numeric "Answer" field (0…pool) with an X to clear it; an unscored
 * one shows the "Set answer" seed — Scales' per-statement scoring pattern.
 * An option with an answer gets the success-tinted outline via `ItemCard`'s
 * `tone`.
 *
 * A controlled row: only the answer-field mirror lives here (the label
 * mirror is `ItemField`'s) while structural ops (schedule / commit / clear /
 * flush / remove / color / image) come in as props from the one
 * `useAllocationEditor` in `AllocationSlideContent`, so every write funnels
 * through a single draft + debounce buffer. Option order is display-only —
 * the answer key is id-keyed — so rows are not drag-sortable.
 */
import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import type { AppImage, McqOption } from "@deck/store/deckApi.gen";
import { ALLOCATION_OPTION_LABEL_MAX } from "@deck/hooks/useAllocationEditor";
import { Btn } from "@ui/Buttons/Btn";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { resolveImageUrl } from "@utils/image";
import { ItemCard, ItemField } from "../_shared";
import styles from "./AllocationSlideContent.module.css";

interface AllocationOptionEditableProps {
  option: McqOption;
  sortIndex: number;
  /** The option's resolved color (override or palette default). */
  color: string;
  /** Whether this row's popover menu is open (at most one per slide). */
  menuOpen: boolean;
  canRemove: boolean;
  /** The pool size — bounds the answer field. */
  totalPoints: number;
  /** The option's correct share of the pool, or undefined while unscored. */
  answer: number | undefined;
  /** What "Set answer" seeds — an even share of the pool. */
  answerSeed: number;
  onMenuOpenChange: (open: boolean) => void;
  onScheduleText: (text: string) => void;
  onFlush: () => void;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  /** Debounced answer edit (the numeric field). */
  onScheduleAnswer: (points: number) => void;
  /** Immediate answer set (the "Set answer" seed). */
  onCommitAnswer: (points: number) => void;
  onClearAnswer: () => void;
  onRemove: () => void;
  openPicker: OpenGalleryPicker;
}

const AllocationOptionEditable = ({
  option,
  sortIndex,
  color,
  menuOpen,
  canRemove,
  totalPoints,
  answer,
  answerSeed,
  onMenuOpenChange,
  onScheduleText,
  onFlush,
  onSetColor,
  onSetImage,
  onScheduleAnswer,
  onCommitAnswer,
  onClearAnswer,
  onRemove,
  openPicker,
}: AllocationOptionEditableProps) => {
  const scored = answer !== undefined;
  const displayIndex = sortIndex + 1;
  const thumbnailSrc = resolveImageUrl(option.image, "SM", option.id, 200, 200, false);

  // Local mirror for the numeric "Answer" field, resynced when the row is
  // reused for a different option or the committed answer changes ("derive
  // state during render" — safe when the new value differs).
  const [points, setPoints] = useState(answer ?? answerSeed);
  const [syncedFromId, setSyncedFromId] = useState(option.id);
  const [syncedFromAnswer, setSyncedFromAnswer] = useState(answer);
  if (syncedFromId !== option.id) {
    setSyncedFromId(option.id);
    setPoints(answer ?? answerSeed);
    setSyncedFromAnswer(answer);
  } else if (syncedFromAnswer !== answer) {
    setSyncedFromAnswer(answer);
    setPoints(answer ?? answerSeed);
  }

  return (
    <ItemCard index={sortIndex} tone={scored ? "success" : undefined} indexColor={color}>
      <div className={styles.optionFields}>
        <ItemField
          itemId={option.id}
          label={option.text}
          image={option.image}
          displayIndex={displayIndex}
          placeholder={`Option ${displayIndex.toString()}`}
          maxLength={ALLOCATION_OPTION_LABEL_MAX}
          color={color}
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          canRemove={canRemove}
          onScheduleLabel={onScheduleText}
          onFlush={onFlush}
          onSetColor={onSetColor}
          onSetImage={onSetImage}
          onRemove={onRemove}
          openPicker={openPicker}
        />
        {thumbnailSrc && <img className={styles.optionThumbnail} src={thumbnailSrc} alt="" />}
        {scored ? (
          <div className={styles.answerField}>
            <NumberInput
              label="Answer"
              id={`alloc-answer-${option.id}`}
              labelPosition="labelInFront"
              value={points}
              min={0}
              max={totalPoints}
              onChange={(next) => {
                setPoints(next);
                onScheduleAnswer(next);
              }}
              onBlur={onFlush}
            />
            <IconBtn
              fill="ghost"
              size="xs"
              icon={<XMarkIcon />}
              aria-label={`Clear correct points for option ${displayIndex.toString()}`}
              onClick={onClearAnswer}
            />
          </div>
        ) : (
          <Btn
            fill="ghost"
            size="xs"
            onClick={() => {
              setPoints(answerSeed);
              onCommitAnswer(answerSeed);
            }}
          >
            Set answer
          </Btn>
        )}
      </div>
    </ItemCard>
  );
};

export { AllocationOptionEditable };
