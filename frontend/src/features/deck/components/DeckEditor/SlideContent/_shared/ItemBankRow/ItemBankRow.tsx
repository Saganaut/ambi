import { AppImage } from "@/features/liveSession/store/liveSessionApi.gen";
import DragIcon from "@assets/icons/action/drag.svg?react";

import { NumberInput } from "@/shared/components/Forms/Input/NumberInput/NumberInput";
import { AppImg } from "@/shared/components/Images/AppImg";
import { IconBtn } from "@/shared/components/UIElements/Buttons/IconBtn";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { emptyImage, resolveImageUrl } from "@/shared/utils/image";
import { numberToLetter } from "@/shared/utils/utils";
import { useSortable } from "@dnd-kit/react/sortable";
import {
  ArrowUturnLeftIcon,
  CheckIcon,
  QuestionMarkCircleIcon,
  ViewfinderCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Ref, useEffect, useRef, useState } from "react";
import { DistributiveOmit } from "react-redux";
import { IndexPill } from "../IndexPill/IndexPill";
import { ItemField } from "../ItemField/ItemField";
import { OptionMenuPrimaryAction } from "../OptionMenu/OptionMenu.types";
import { Identified, PlaceableItem } from "../placement/placement.types";
import styles from "./ItemBankRow.module.css";
import { ScaleTracker } from "./ScaleTracker";

interface ItemBankRowBase {
  type: "allocation" | "placement" | "ranking" | "scales";
  item: Identified<PlaceableItem>;
  index: number;
  color: string;
  menuOpen: boolean;
  canRemove: boolean;
  /** Whether this row is armed — a press on the surface places its target. */
  selected?: boolean;
  /** Arm this row (row-wide click; the keyboard path is the label's focus). */
  onSelect?: () => void;
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
  correctValue?: number;
}
interface RankingRowProps extends ItemBankRowBase {
  type: "ranking";
}
interface PlacementItemRowProps extends ItemBankRowBase {
  type: "placement";
  /** Whether the item carries an answer-key target. Drives the trailing
   * check / question-mark toggle and the menu's Set/Clear target entry:
   * an unplaced target exists but keys no right answer, so it is not graded. */
  hasTarget: boolean;
  /** Start targeting the item. The surface decides what that means — Axis and
   * Place-on-Image seed a centre point the author then drags, Grid has no such
   * default cell so it arms the row for the matrix instead. */
  onSetTarget: () => void;
  /** Drop the item's target, leaving it unkeyed. */
  onClearTarget: () => void;
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

/**Extra action to pass to the menu **/
//   primaryAction?: OptionMenuPrimaryAction;

type ItemBankRowProps =
  | ScalesRowProps
  | RankingRowProps
  | AllocationRowProps
  | PlacementItemRowProps;
/**
 * Question mark vs check mark needs to indicate scoring status
 * Should be common to all slides but need to figure out how to handle for ranking
 * For ranking a click on that button should change overall scorability of slide, so all items.
 * Pass the onclick for htis
 *
 *  **/
const ItemBankRow = (props: ItemBankRowProps) => {
  const {
    type,
    item,
    index,
    color,
    menuOpen,
    canRemove,
    selected,
    onSelect,
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

  // Placement and grid rows are numbered, not lettered: the bank's pill must
  // read as the same marker the author sees on the surface.
  const displayIndex = type === "placement" ? (index + 1).toString() : numberToLetter(index + 1);
  const thumbnailSrc = resolveImageUrl(item.image, "SM", item.id ?? "", 200, 200, false);
  // Ranking never needs to use this since the order displayed is the correct answer.
  // For other questions individual values need to be set and is this relevant
  const scored =
    type === "ranking" ? false : type === "placement" ? props.hasTarget : props.correctValue;
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

  const toggleScorability = () => {
    switch (type) {
      case "allocation": {
        if (scored) {
          props.onClear();
          return;
        }
        const seed = props.poolShareSeed ?? 0;
        setPoints(seed);
        props.onCommit(seed);
        return;
      }
      case "scales": {
        if (scored) {
          props.onClear();
          return;
        }
        props.onCommit((props.minScale + props.maxScale) / 2);
        return;
      }
      case "placement": {
        if (props.hasTarget) props.onClearTarget();
        else props.onSetTarget();
        return;
      }
    }
  };

  const placementAction: OptionMenuPrimaryAction | undefined =
    type === "placement"
      ? {
          label: props.hasTarget ? "Clear target" : "Set target",
          icon: props.hasTarget ? ArrowUturnLeftIcon : ViewfinderCircleIcon,
          pressed: props.hasTarget,
          onSelect: () => {
            onMenuOpenChange(false);
            toggleScorability();
          },
        }
      : undefined;

  // The grip sits inside the row's click target, and a finished drag ends with
  // a click the browser fires over the row — which would arm it. The guard
  // latches while dragging and is cleared by the next pointerdown, so exactly
  // one post-drop click is swallowed and the keyboard path is untouched.
  const draggedRef = useRef(false);
  useEffect(() => {
    if (isDragging) draggedRef.current = true;
  }, [isDragging]);

  return (
    // Row-wide selection target; the keyboard path is the label field's focus.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      ref={rootRef}
      className={[styles.row, isDragging ? styles.isDragging : "", selected ? styles.selected : ""]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={() => {
        draggedRef.current = false;
      }}
      onClick={() => {
        if (draggedRef.current) {
          draggedRef.current = false;
          return;
        }
        onSelect?.();
      }}
    >
      <IndexPill value={displayIndex} color={color} />
      <div className={`${styles.collapsable} ${thumbnailSrc !== null ? styles.expanded : ""}`}>
        <span className={styles.thumbnailWrap}>
          {thumbnailSrc && (
            <AppImg
              className={styles.thumbnail}
              src={thumbnailSrc}
              alt={`Img Option ${displayIndex}`}
              fallbackSeed={item.id}
            />
          )}
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
      </div>

      <ItemField
        itemId={item.id}
        label={type === "allocation" ? props.label : props.item.label}
        image={item.image}
        displayIndex={index + 1}
        placeholder={`${(index + 1).toString()}`}
        maxLength={100}
        color={color}
        open={menuOpen}
        onOpenChange={onMenuOpenChange}
        canRemove={canRemove}
        primaryAction={placementAction ?? primaryAction}
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
          correctValue={props.correctValue}
          color={color}
        />
      )}
      {/* Number input for allocation question */}
      {type === "allocation" && (
        <div
          className={`${styles.collapsable} ${props.correctValue !== undefined ? styles.expanded : ""}`}
        >
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
          </div>
        </div>
      )}

      {type !== "ranking" && (
        <>
          {scored ? (
            <IconBtn
              fill="ghost"
              size="xs"
              icon={<CheckIcon />}
              aria-label={
                type === "placement"
                  ? `Clear the target position for target ${displayIndex}`
                  : `Clear correct points for option ${displayIndex.toString()}`
              }
              onClick={(e) => {
                // Clicking anywhere on the row arms it — this toggle must not.
                e.stopPropagation();
                toggleScorability();
              }}
            />
          ) : (
            <IconBtn
              fill="ghost"
              size="xs"
              icon={<QuestionMarkCircleIcon />}
              aria-label={
                type === "placement"
                  ? `Set a target position for target ${displayIndex}`
                  : `Set option ${displayIndex.toString()} as scorable`
              }
              onClick={(e) => {
                e.stopPropagation();
                toggleScorability();
              }}
            />
          )}
        </>
      )}
      {/* // Drag icon, always at the end */}
      <span
        ref={handleRef}
        className={styles.grip}
        role="button"
        aria-label={
          type === "placement"
            ? `Reorder target ${(index + 1).toString()}`
            : `Reorder option ${(index + 1).toString()}`
        }
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
