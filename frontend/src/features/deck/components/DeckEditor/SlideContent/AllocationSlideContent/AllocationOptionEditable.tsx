/**
 * Single-row editor for an Allocation option
 */
import { QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { AppImg } from "@components/Images/AppImg";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { ALLOCATION_OPTION_LABEL_MAX } from "@deck/hooks/useAllocationEditor";
import type { AppImage, McqOption } from "@deck/store/deckApi.gen";
import { Btn } from "@saganaut/ambi-ui";
import { emptyImage, resolveImageUrl } from "@utils/image";
import { ItemField, SortableItemCard } from "../_shared";
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
    <SortableItemCard
      id={option.id}
      index={sortIndex}
      color={color}
      itemNoun="option"
      scored={scored}
    >
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
        {thumbnailSrc && (
          <span className={styles.optionThumbnailWrap}>
            <AppImg className={styles.optionThumbnail} src={thumbnailSrc} alt="" fallbackSeed={option.id} />
            <Btn
              fill="ghost"
              size="xs"
              className={styles.optionThumbnailClear}
              icon={<XMarkIcon />}
              aria-label={`Remove option ${displayIndex.toString()} image`}
              onClick={(e) => {
                e.stopPropagation();
                onSetImage(emptyImage());
              }}
            />
          </span>
        )}
        {scored ? (
          <div className={styles.answerField}>
            <NumberInput
              label=""
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
            <Btn
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
            icon={<QuestionMarkCircleIcon />}
            aria-label={`Set option ${displayIndex.toString()} as scorable`}
            onClick={() => {
              setPoints(answerSeed);
              onCommitAnswer(answerSeed);
            }}
          />
        )}
      </div>
    </SortableItemCard>
  );
};

export { AllocationOptionEditable };
