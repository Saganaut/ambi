import DragIcon from "@assets/icons/action/drag.svg?react";

import { NumberInput } from "@/shared/components/Forms/Input/NumberInput/NumberInput";
import { AppImg } from "@/shared/components/Images/AppImg";
import { IconBtn } from "@/shared/components/UIElements/Buttons/IconBtn";
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
import { useEffect, useRef, useState } from "react";
import { IndexPill } from "../IndexPill/IndexPill";
import { EditableItem, SortableEditableItem } from "../Item.types";
import { ItemField } from "../ItemField/ItemField";
import { OptionMenuPrimaryAction } from "../OptionMenu/OptionMenu.types";
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

  // Placement and grid rows are numbered, not lettered: the bank's pill must
  // read as the same marker the author sees on the surface.
  const displayIndex =
    kind === "PLACE_ON_IMAGE" ? (sourceIndex + 1).toString() : numberToLetter(sourceIndex + 1);
  const thumbnailSrc = resolveImageUrl(item.image, "SM", item.id ?? "", 200, 200, false);

  // Ranking never needs to use this since the order displayed is the correct answer.
  // For other questions individual values need to be set and is this relevant

  const scored = actions.getIsScorable(item.id);
  const [points, setPoints] = useState(
    kind === "ALLOCATION" ? (detail.correctValue ?? detail.totalPool) : 0,
  );
  const [syncedFromId, setSyncedFromId] = useState(item.id);
  const [syncedFromAnswer, setSyncedFromAnswer] = useState(
    kind === "ALLOCATION" ? detail.correctValue : 0,
  );

  if (kind === "ALLOCATION") {
    if (syncedFromId !== item.id) {
      setSyncedFromId(item.id);
      setPoints(detail.correctValue ?? detail.totalPool);
      setSyncedFromAnswer(detail.correctValue);
    } else if (syncedFromAnswer !== detail.correctValue) {
      setSyncedFromAnswer(detail.correctValue);
      setPoints(detail.correctValue ?? detail.totalPool);
    }
  }

  const toggleScorability = () => {
    switch (kind) {
      case "ALLOCATION": {
        if (scored) {
          detail.onClear();
          return;
        }
        const seed = detail.totalPool ?? 0;
        setPoints(seed);
        detail.onCommit(seed);
        return;
      }
      case "SCALES": {
        if (scored) {
          detail.onClear();
          return;
        }
        detail.onCommit((detail.minValue + detail.maxValue) / 2);
        return;
      }
      case "PLACEMENT": {
        if (detail.target != null) detail.onClearTarget();
        else detail.onSetTarget();
        return;
      }
    }
  };

  const placementAction: OptionMenuPrimaryAction | undefined =
    kind === "PLACEMENT"
      ? {
          label: detail.target != null ? "Clear target" : "Set target",
          icon: detail.target != null ? ArrowUturnLeftIcon : ViewfinderCircleIcon,
          pressed: detail.target != null,
          onSelect: () => {
            actions.onMenuOpenChange(false);
            toggleScorability();
          },
        }
      : undefined;

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
        actions.onSelect?.();
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
              actions.onSetImage(emptyImage());
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
        open={actions.menuOpen}
        onOpenChange={actions.onMenuOpenChange}
        canRemove={actions.canRemove}
        primaryAction={placementAction ?? actions.primaryAction}
        onScheduleLabel={actions.onScheduleLabel}
        onFlush={actions.onFlush}
        onSetColor={actions.onSetColor}
        onSetImage={actions.onSetImage}
        onRemove={actions.onRemove}
        openPicker={actions.openPicker}
      />

      {/* Tracker for scales question */}
      {kind === "scale" && (
        <ScaleTracker
          min={detail.minValue}
          max={detail.maxValue}
          tolerance={detail.tolerance}
          leftLabel={detail.leftLabel}
          rightLabel={detail.rightLabel}
          displayIndex={displayIndex}
          onCommit={detail.onCommit}
          onScheduleAnswer={detail.onScheduleAnswer}
          correctValue={detail.correctValue}
          color={item.color}
        />
      )}
      {/* Number input for allocation question */}
      {kind === "ALLOCATION" && (
        <div
          className={`${styles.collapsable} ${detail.correctValue !== undefined ? styles.expanded : ""}`}
        >
          <div className={styles.answerField}>
            <NumberInput
              label=""
              id={`alloc-answer-${item.id}`}
              labelPosition="labelInFront"
              value={points ?? 0}
              min={0}
              max={detail.totalPool}
              onChange={(next) => {
                setPoints(next);
                detail.onScheduleAnswer(next);
              }}
              onBlur={actions.onFlush}
            />
          </div>
        </div>
      )}

      {kind !== "ranking" && (
        <>
          {scored ? (
            <IconBtn
              fill="ghost"
              size="xs"
              icon={<CheckIcon />}
              aria-label={
                kind === "PLACEMENT"
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
                kind === "PLACEMENT"
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
        ref={sortable.handleRef}
        className={styles.grip}
        role="button"
        aria-label={
          kind === "PLACEMENT"
            ? `Reorder target ${(sourceIndex + 1).toString()}`
            : `Reorder option ${(sourceIndex + 1).toString()}`
        }
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
