import { AppImage } from "@/features/liveSession/store/liveSessionApi.gen";
import DragIcon from "@assets/icons/action/drag.svg?react";

import { NumberInput } from "@/shared/components/Forms/Input/NumberInput/NumberInput";
import { IconBtn } from "@/shared/components/UIElements/Buttons/IconBtn";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { emptyImage, resolveImageUrl } from "@/shared/utils/image";
import { useSortable } from "@dnd-kit/react/sortable";
import { QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Ref, useState } from "react";
import { IndexPill } from "../IndexPill/IndexPill";
import { ItemField } from "../ItemField/ItemField";
import { OptionMenuPrimaryAction } from "../OptionMenu/OptionMenu.types";
import { Identified, PlaceableItem } from "../placement/placement.types";
import styles from "./ItemBankRow.module.css";

interface ItemBankRowProps {
  /** Shoould cover all options but for allocaiton may have to omit items **/
  item: Identified<PlaceableItem>;
  label?: string;
  index: number;
  color: string;
  menuOpen: boolean;
  canRemove: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onScheduleLabel: (label: string) => void; // ALso known as onScheudleText in AllocationOptioneditable?
  onFlush: () => void;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  onRemove: () => void;
  openPicker: OpenGalleryPicker;

  /** onSechdule is like onCommit but debounced - Only useful for items with a set answer**/
  onCommit?: (value: number) => void;
  onScheduleAnswer?: (value: number) => void;
  onClear?: () => void;

  /**Extra action to pass to the menu **/
  primaryAction?: OptionMenuPrimaryAction;

  /** scored not useful for scales & allocation since it is derived by the presence of an answer **/
  scored?: boolean;

  /** Applicable to scales & allocation**/
  correctValue?: number;

  /** Only applicable to allocation **/
  poolShareSeed?: number;
  totalPool?: number;

  /** Only applicable to Scales **/
  minScale?: number;
  maxScale?: number;
  toleranceScale?: number;
  leftLabel?: string;
  rightLabel?: string;

  /** Needed to put on the DragIcon -- if we provide this ref it is draggable**/
  handleRef?: (element: Element | null) => void;
  rootRef?: Ref<HTMLDivElement>;
  isDragging?: boolean;
}
const ItemBankRow = ({
  item,
  label = item.label,
  index,
  color,
  menuOpen,
  canRemove,
  onMenuOpenChange,
  onScheduleLabel,
  onFlush,
  onSetColor,
  onSetImage,
  onClear,
  primaryAction,
  openPicker,
  correctValue,
  poolShareSeed,
  totalPool,
  onScheduleAnswer,
  onCommit,
  handleRef,
  rootRef,
  isDragging,
  onRemove,
}: ItemBankRowProps) => {
  const displayIndex = index + 1;
  const thumbnailSrc = resolveImageUrl(item.image, "SM", item.id ?? "", 200, 200, false);

  const [points, setPoints] = useState(correctValue ?? poolShareSeed);
  const [syncedFromId, setSyncedFromId] = useState(item.id);
  const [syncedFromAnswer, setSyncedFromAnswer] = useState(correctValue);
  if (syncedFromId !== item.id) {
    setSyncedFromId(item.id);
    setPoints(correctValue ?? poolShareSeed);
    setSyncedFromAnswer(correctValue);
  } else if (syncedFromAnswer !== correctValue) {
    setSyncedFromAnswer(correctValue);
    setPoints(correctValue ?? poolShareSeed);
  }

  return (
    <div ref={rootRef} className={`${styles.row} ${isDragging ? styles.isDragging : ""}`}>
      <IndexPill value={displayIndex} color={color} />
      {thumbnailSrc && (
        <span className={styles.thumbnailWrap}>
          <img className={styles.thumbnail} src={thumbnailSrc} alt="" />
          <IconBtn
            fill="ghost"
            size="xs"
            className={styles.thumbnailClear}
            icon={<XMarkIcon />}
            aria-label={`Remove ${displayIndex.toString()} image`}
            onClick={(e) => {
              e.stopPropagation();
              onSetImage(emptyImage());
            }}
          />
        </span>
      )}
      <ItemField
        itemId={item.id}
        label={label}
        image={item.image}
        displayIndex={index}
        placeholder={`${index.toString()}`}
        maxLength={100}
        color={color}
        open={menuOpen}
        onOpenChange={onMenuOpenChange}
        canRemove={canRemove}
        primaryAction={primaryAction}
        onScheduleLabel={onScheduleLabel}
        onFlush={onFlush}
        onSetColor={onSetColor}
        onSetImage={onSetImage}
        onRemove={onRemove}
        openPicker={openPicker}
      />
      {onScheduleAnswer && onCommit ? (
        correctValue !== undefined ? (
          <div className={styles.answerField}>
            <NumberInput
              label=""
              id={`alloc-answer-${item.id}`}
              labelPosition="labelInFront"
              value={points ?? 0}
              min={0}
              max={totalPool}
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
              onClick={onClear}
            />
          </div>
        ) : (
          <IconBtn
            fill="ghost"
            size="xs"
            icon={<QuestionMarkCircleIcon />}
            aria-label={`Set option ${displayIndex.toString()} as scorable`}
            onClick={() => {
              const seed = poolShareSeed ?? 0;
              setPoints(seed);
              onCommit(seed);
            }}
          />
        )
      ) : null}
      {/* // Drag icon, always at the end */}
      <span
        ref={handleRef}
        className={styles.grip}
        role="button"
        aria-label={`Reorder option ${index.toString()}`}
      >
        <DragIcon className={styles.gripIcon} aria-hidden="true" />
      </span>
    </div>
  );
};

const SortableItemBankRow = ({ item, ...rowProps }: Omit<ItemBankRowProps, "handleRef">) => {
  const { ref, handleRef, isDragging } = useSortable({
    id: item.id,
    index: rowProps.index,
  });
  return (
    <ItemBankRow
      {...rowProps}
      item={item}
      handleRef={handleRef}
      rootRef={ref}
      isDragging={isDragging}
    />
  );
};

export { ItemBankRow, SortableItemBankRow };
