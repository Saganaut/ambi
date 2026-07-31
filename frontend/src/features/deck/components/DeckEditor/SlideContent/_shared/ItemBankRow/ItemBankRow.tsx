import { AppImage } from "@/features/liveSession/store/liveSessionApi.gen";
import DragIcon from "@assets/icons/action/drag.svg?react";

import { NumberInput } from "@/shared/components/Forms/Input/NumberInput/NumberInput";
import { IconBtn } from "@/shared/components/UIElements/Buttons/IconBtn";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { emptyImage, resolveImageUrl } from "@/shared/utils/image";
import { numberToLetter } from "@/shared/utils/utils";
import { useSortable } from "@dnd-kit/react/sortable";
import { QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Ref, useState } from "react";
import { DistributiveOmit } from "react-redux";
import { IndexPill } from "../IndexPill/IndexPill";
import { ItemField } from "../ItemField/ItemField";
import { OptionMenuPrimaryAction } from "../OptionMenu/OptionMenu.types";
import { Identified, PlaceableItem } from "../placement/placement.types";
import styles from "./ItemBankRow.module.css";
import { ScaleTracker } from "./ScaleTracker";

interface ItemBankRowBase {
  type: "allocation" | "ranking" | "scales";
  item: Identified<PlaceableItem>;
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
  handleRef: (element: Element | null) => void;
  rootRef: Ref<HTMLDivElement>;
  isDragging: boolean;
  primaryAction?: OptionMenuPrimaryAction;
}
//TODO: label only exists here because PlacebleItem calls the value text but allocation uses
//mcqoption type - should be resolved for consistency
interface AllocationRowProps extends ItemBankRowBase {
  type: "allocation";
  label: string;
  onCommit: (value: number) => void;
  onScheduleAnswer: (value: number) => void;
  onClear: () => void;
  poolShareSeed: number;
  totalPool: number;
  correctValue: number;
}
interface RankingRowProps extends ItemBankRowBase {
  type: "ranking";
}
interface ScalesRowProps extends ItemBankRowBase {
  type: "scales";
  onCommit: (value: number) => void;
  onScheduleAnswer: (value: number) => void;
  onClear: () => void;
  correctValue: number;
  minScale: number;
  maxScale: number;
  toleranceScale: number;
  leftLabel: string;
  rightLabel: string;
}
/** Shoould cover all options but for allocaiton may have to omit items **/

/** onSechdule is like onCommit but debounced - Only useful for items with a set answer**/

/**Extra action to pass to the menu **/
//   primaryAction?: OptionMenuPrimaryAction;
/** scored not useful for scales & allocation since it is derived by the presence of an answer **/
//   scored?: boolean;
type ItemBankRowProps = ScalesRowProps | RankingRowProps | AllocationRowProps;

const ItemBankRow = (props: ItemBankRowProps) => {
  const {
    type,
    item,
    index,
    color,
    menuOpen,
    canRemove,
    onMenuOpenChange,
    onScheduleLabel,
    onFlush,
    onSetColor,
    onSetImage,
    onRemove,
    openPicker,
    primaryAction,
    handleRef,
    rootRef,
    isDragging,
  } = props;

  const displayIndex = numberToLetter(index + 1);
  const thumbnailSrc = resolveImageUrl(item.image, "SM", item.id ?? "", 200, 200, false);

  const [points, setPoints] = useState(
    type === "allocation" ? (props.correctValue ?? props.poolShareSeed) : 0,
  );
  const [syncedFromId, setSyncedFromId] = useState(item.id);
  const [syncedFromAnswer, setSyncedFromAnswer] = useState(
    type === "allocation" ? props.correctValue : 0,
  );

  if (type === "allocation") {
    if (syncedFromId !== item.id) {
      setSyncedFromId(item.id);
      setPoints(props.correctValue ?? props.poolShareSeed);
      setSyncedFromAnswer(props.correctValue);
    } else if (syncedFromAnswer !== props.correctValue) {
      setSyncedFromAnswer(props.correctValue);
      setPoints(props.correctValue ?? props.poolShareSeed);
    }
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
        label={type === "allocation" ? props.label : props.item.label}
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

      {/* Tracker for scales question */}
      {type === "scales" && (
        <ScaleTracker
          min={props.minScale}
          max={props.maxScale}
          tolerance={props.toleranceScale}
          leftLabel={props.leftLabel}
          rightLabel={props.rightLabel}
          displayIndex={displayIndex}
          onCommit={props.onCommit}
          onScheduleAnswer={props.onScheduleAnswer}
          onClear={props.onClear}
        />
      )}
      {/* Number input for allocation question */}
      {type === "allocation" ? (
        props.correctValue !== undefined ? (
          <div className={styles.answerField}>
            <NumberInput
              label=""
              id={`alloc-answer-${item.id}`}
              labelPosition="labelInFront"
              value={points ?? 0}
              min={0}
              max={props.totalPool}
              onChange={(next) => {
                setPoints(next);
                props.onScheduleAnswer(next);
              }}
              onBlur={onFlush}
            />
            <IconBtn
              fill="ghost"
              size="xs"
              icon={<XMarkIcon />}
              aria-label={`Clear correct points for option ${displayIndex.toString()}`}
              onClick={props.onClear}
            />
          </div>
        ) : (
          <IconBtn
            fill="ghost"
            size="xs"
            icon={<QuestionMarkCircleIcon />}
            aria-label={`Set option ${displayIndex.toString()} as scorable`}
            onClick={() => {
              const seed = props.poolShareSeed ?? 0;
              setPoints(seed);
              props.onCommit(seed);
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
type SortableItemBankRowProps = DistributiveOmit<
  ItemBankRowProps,
  "handleRef" | "rootRef" | "isDragging"
>;
const SortableItemBankRow = (rowProps: SortableItemBankRowProps) => {
  const { ref, handleRef, isDragging } = useSortable({
    id: rowProps.item.id,
    index: rowProps.index,
  });
  return <ItemBankRow {...rowProps} handleRef={handleRef} rootRef={ref} isDragging={isDragging} />;
};

export { ItemBankRow, SortableItemBankRow };
