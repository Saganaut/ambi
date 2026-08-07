import DragIcon from "@assets/icons/action/drag.svg?react";

import { NumberInput } from "@/shared/components/Forms/Input/NumberInput/NumberInput";
import { AppImg } from "@/shared/components/Images/AppImg";
import { IconBtn } from "@/shared/components/UIElements/Buttons/IconBtn";
import { emptyImage, resolveImageUrl } from "@/shared/utils/image";
import { numberToLetter } from "@/shared/utils/utils";
import { useSortable } from "@dnd-kit/react/sortable";
import { CheckIcon, QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { IndexPill } from "../IndexPill/IndexPill";
import { EditableItem, SortableEditableItem } from "../Item.types";
import { ItemField } from "../ItemField/ItemField";
import styles from "./ItemBankRow.module.css";
import { ScaleTracker } from "./ScaleTracker";

/** * Question mark vs check mark needs to indicate scoring status
 * Should be common to all slides but need to figure out how to handle for ranking
 * For ranking a click on that button should change overall scorability of slide, so all items.
 * Pass the onclick for htis
 *
 *  **/
const ItemBankRow = (props: SortableEditableItem) => {
  const { detail, item, sourceIndex, actions, kind, state, sortable } = props;
  const displayIndex = numberToLetter(sourceIndex + 1);
  const thumbnailSrc = resolveImageUrl(item.image, "SM", item.id ?? "", 200, 200, false);

  // Ranking never needs to use this since the order displayed is the correct answer.
  // For other questions individual values need to be set and is this relevant

  const [points, setPoints] = useState(kind === "ALLOCATION" ? detail.correctValue : 1);
  const [syncedFromId, setSyncedFromId] = useState(item.id);
  const [syncedFromAnswer, setSyncedFromAnswer] = useState(
    kind === "ALLOCATION" ? detail.correctValue : 0,
  );

  if (kind === "ALLOCATION") {
    if (syncedFromId !== item.id) {
      setSyncedFromId(item.id);
      setPoints(detail.correctValue);
      setSyncedFromAnswer(detail.correctValue);
    } else if (syncedFromAnswer !== detail.correctValue) {
      setSyncedFromAnswer(detail.correctValue);
      setPoints(detail.correctValue);
    }
  }

  // const toggleScorability = () => {
  //   switch (kind) {
  //     case "ALLOCATION": {
  //       if (scored) {
  //         detail.onClear();
  //         return;
  //       }
  //       const seed = detail.totalPool ?? 0;
  //       setPoints(seed);
  //       detail.onCommit(seed);
  //       return;
  //     }
  //     case "SCALES": {
  //       if (scored) {
  //         detail.onClear();
  //         return;
  //       }
  //       detail.onCommit((detail.minValue + detail.maxValue) / 2);
  //       return;
  //     }
  //     case "PLACEMENT": {
  //       if (detail.target != null) detail.onClearTarget();
  //       else detail.onSetTarget();
  //       return;
  //     }
  //   }
  // };

  // const placementAction: OptionMenuPrimaryAction | undefined =
  //   kind === "PLACEMENT"
  //     ? {
  //         label: detail.target != null ? "Clear target" : "Set target",
  //         icon: detail.target != null ? ArrowUturnLeftIcon : ViewfinderCircleIcon,
  //         pressed: detail.target != null,
  //         onSelect: () => {
  //           actions.setMenuIsOpenForItem(false);
  //           toggleScorability();
  //         },
  //       }
  //     : undefined;

  // The grip sits inside the row's click target, and a finished drag ends with
  // a click the browser fires over the row — which would arm it. The guard
  // latches while dragging and is cleared by the next pointerdown, so exactly
  // one post-drop click is swallowed and the keyboard path is untouched.
  //TODO: why no dependency here
  const draggedRef = useRef(false);
  useEffect(() => {
    if (sortable.isDragging) draggedRef.current = true;
  }, []);

  return (
    // Row-wide selection target; the keyboard path is the label field's focus.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      ref={sortable.rootRef}
      className={[
        styles.row,
        sortable.isDragging ? styles.isDragging : "",
        state.isSelected ? styles.selected : "",
      ]
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
        actions.selectItem?.();
      }}
    >
      <IndexPill value={displayIndex} color={item.color} />
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
              actions.setImageForItem(emptyImage());
            }}
          />
        </span>
      </div>

      <ItemField
        itemId={item.id}
        label={kind === "ALLOCATION" ? item.label : props.item.label}
        image={item.image}
        displayIndex={sourceIndex + 1}
        placeholder={`${(sourceIndex + 1).toString()}`}
        maxLength={100}
        color={item.color}
        open={state.menuIsOpen}
        onOpenChange={actions.setMenuIsOpenForItem}
        canRemove={state.canRemove}
        //TODO: Need to figure out what we do with this. Is it still relevant if so how do we pass it
        // primaryAction={placementAction ?? actions.primaryAction}
        onScheduleLabel={actions.scheduleItemLabel}
        onFlush={actions.flush}
        onSetColor={actions.setColorForItem}
        onSetImage={actions.setImageForItem}
        onRemove={actions.removeItem}
        openPicker={actions.openImagePicker}
      />

      {/* Tracker for scales question */}
      {kind === "SCALES" && (
        <ScaleTracker
          min={detail.min}
          max={detail.max}
          tolerance={detail.tolerance}
          leftLabel={detail.lowLabel}
          rightLabel={detail.highLabel}
          displayIndex={displayIndex}
          onCommit={actions.commitCorrectAnswer}
          onScheduleAnswer={actions.scheduleCorrectAnswer}
          correctValue={detail.correctValue}
          color={item.color}
        />
      )}
      {/* Number input for allocation question */}
      {kind === "ALLOCATION" && (
        <div
          className={`${styles.collapsable} ${detail.correctValue !== undefined ? styles.expanded : ""}`}
        >
          <NumberInput
            label=""
            id={`alloc-answer-${item.id}`}
            labelPosition="labelInFront"
            value={points ?? detail.totalPool}
            min={0}
            max={detail.totalPool}
            onChange={(next) => {
              setPoints(next);
              actions.scheduleCorrectAnswer(next);
            }}
            onBlur={actions.flush}
          />
        </div>
      )}

      {kind !== "RANKING" && (
        <>
          {state.isScorable ? (
            <IconBtn
              fill="ghost"
              size="xs"
              icon={<CheckIcon />}
              aria-label={"Toggle scorability"}
              onClick={(e) => {
                // Clicking anywhere on the row arms it — this toggle must not.
                e.stopPropagation();
                actions.toggleScorabilityForItem();
              }}
            />
          ) : (
            <IconBtn
              fill="ghost"
              size="xs"
              icon={<QuestionMarkCircleIcon />}
              aria-label={"Toggle scorability"}
              onClick={(e) => {
                e.stopPropagation();
                actions.toggleScorabilityForItem();
              }}
            />
          )}
        </>
      )}
      {/* // Drag icon, always at the end */}
      <span
        ref={sortable.handleRef}
        className={styles.grip}
        role="button"
        aria-label={`Reorder item ${(sourceIndex + 1).toString()}`}
      >
        <DragIcon className={styles.gripIcon} aria-hidden="true" />
      </span>
    </div>
  );
};
const SortableItemBankRow = (rowProps: EditableItem) => {
  const { ref, handleRef, isDragging } = useSortable({
    id: rowProps.item.id,
    index: rowProps.sourceIndex,
  });

  const sortable = { rootRef: ref, handleRef: handleRef, isDragging: isDragging };
  return <ItemBankRow {...{ ...rowProps, sortable }} />;
};
export { ItemBankRow, SortableItemBankRow };
