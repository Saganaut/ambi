/**
 * The one row every item-bank slide editor lists — Axis, Grid, Ranking, and
 * Place-on-Image. Left to right: the colored index pill, the item's image
 * thumbnail when it has one (with a hover-revealed remove button mirroring the
 * menu's "Remove image" row), the editable label field with its popover menu,
 * an optional trailing meta slot (e.g. Grid's cell name), the "answer set"
 * check, and the drag grip.
 *
 * It owns the row's chrome — surface, radius, elevation, the selected border,
 * the dimmed dragging state — and the drag wiring. It deliberately does NOT
 * own:
 *   - the label draft, the popover, or the menu body: that is `ItemField`,
 *     which mirrors the label locally and renders `OptionMenuContent`; the
 *     kind-specific leading menu entry arrives as `primaryAction`;
 *   - the pill's look: `IndexPill` (solid, tinted by the item's color, the
 *     same fill its marker carries on the surface);
 *   - the dnd context or the drop itself: the consumer wraps its list in
 *     `DragDropWrapper` and handles `onDragEnd`, so the row never learns the
 *     list's shape;
 *   - what "scored" means: each editor decides (a target position, a cell, or
 *     unconditionally, where authoring order *is* the answer).
 *
 * Clicking anywhere on the row selects it; the keyboard path is focusing the
 * label field, which both selects the row (via `onMenuOpenChange`) and opens
 * its menu — hence the two a11y suppressions here rather than at each editor.
 * The grip lives inside that click target, so a finished drag would otherwise
 * select the row it just moved — see `useClickAfterDragGuard`.
 *
 * `useSortable` cannot be switched on and off by a prop, so `draggable` picks
 * between two private components at the top of `PlacementRow`; both render the
 * same private base row, which keeps this file to one public export.
 */
import { useSortable } from "@dnd-kit/react/sortable";
import { useEffect, useRef, type ReactNode, type Ref } from "react";

import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import CheckIcon from "@assets/icons/status/check-solid.svg?react";
import DragIcon from "@assets/icons/action/drag.svg?react";
import type { AppImage } from "@deck/store/deckApi.gen";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { emptyImage, resolveImageUrl } from "@utils/image";
import { IndexPill } from "../IndexPill/IndexPill";
import { ItemField } from "../ItemField/ItemField";
import type { OptionMenuPrimaryAction } from "../OptionMenu/OptionMenu.types";
import type { Identified, PlaceableItem } from "../placement/placement.types";
import styles from "./PlacementRow.module.css";

/** Everything a row takes regardless of whether it can be dragged. */
interface PlacementRowBaseProps {
  item: PlaceableItem;
  /** 0-based position — drives the index pill, placeholder, and menu label. */
  index: number;
  /** Resolved item color, shared with the item's marker on the surface. */
  color: string;
  /** Singular noun for the placeholder and grip label ("Item", "Target"). */
  itemNoun: string;
  labelMaxLength: number;
  /** Whether this row is selected (armed for placement, where that applies). */
  selected?: boolean;
  /** Whether this row's popover menu is open (at most one per slide). */
  menuOpen: boolean;
  canRemove: boolean;
  /** The kind-specific leading menu action (set target, …). */
  primaryAction?: OptionMenuPrimaryAction;
  /** Trailing status text inside the row (e.g. which cell an item sits in). */
  meta?: ReactNode;
  /** Whether this row carries an answer — shows the trailing check. */
  scored?: boolean;
  /** Accessible name for the grip; defaults to "Reorder <noun> <n>". */
  gripLabel?: string;
  onSelect?: () => void;
  onMenuOpenChange: (open: boolean) => void;
  onScheduleLabel: (label: string) => void;
  onFlush: () => void;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  onRemove: () => void;
  openPicker: OpenGalleryPicker;
}

/**
 * A draggable row must carry an identified item: `useSortable` keys the list on
 * it, and two rows sharing a key (or an empty-string stand-in) would reorder
 * each other. The editors' views only publish identified items, so `draggable`
 * costs their call sites nothing.
 */
type PlacementRowProps = PlacementRowBaseProps &
  (
    | { draggable: true; item: Identified<PlaceableItem> }
    | { draggable?: false; item: PlaceableItem }
  );

/** The base row's own props: the public set minus the two drag switches, plus
 *  the sortable wiring `SortableRow` injects (nothing when it isn't used), and
 *  the press that clears the post-drag click guard. */
interface BaseRowProps extends Omit<PlacementRowBaseProps, "gripLabel"> {
  rootRef?: Ref<HTMLDivElement>;
  grip?: ReactNode;
  dragging?: boolean;
  onPointerDown?: () => void;
}

/**
 * Swallow the click a finished grip drag leaves behind.
 *
 * The grip sits inside the row's click target, and a pointer drag ends with a
 * `pointerup` over the row that the browser follows with a `click`. That click
 * would run `onSelect` — arming the row for placement — so the author's next
 * press on the plane or the matrix would relocate the item they only meant to
 * reorder. The guard latches while the row is dragging and is cleared by the
 * next `pointerdown`: a genuine click always begins with one, the click after a
 * drop never does, so exactly one click is swallowed and the keyboard path
 * (which never produces a click here) is untouched.
 */
const useClickAfterDragGuard = (isDragging: boolean, onSelect?: () => void) => {
  const draggedRef = useRef(false);

  useEffect(() => {
    if (isDragging) draggedRef.current = true;
  }, [isDragging]);

  return {
    onPointerDown: () => {
      draggedRef.current = false;
    },
    onSelect: () => {
      if (draggedRef.current) {
        draggedRef.current = false;
        return;
      }
      onSelect?.();
    },
  };
};

const BaseRow = ({
  item,
  index,
  color,
  itemNoun,
  labelMaxLength,
  selected = false,
  menuOpen,
  canRemove,
  primaryAction,
  meta,
  scored = false,
  rootRef,
  grip,
  dragging = false,
  onSelect,
  onPointerDown,
  onMenuOpenChange,
  onScheduleLabel,
  onFlush,
  onSetColor,
  onSetImage,
  onRemove,
  openPicker,
}: BaseRowProps) => {
  const displayIndex = index + 1;
  const thumbnailSrc = resolveImageUrl(item.image, "SM", item.id ?? "", 200, 200, false);

  return (
    // Row-wide selection target; the keyboard path is the label field's focus.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      ref={rootRef}
      className={[styles.row, selected ? styles.selected : "", dragging ? styles.dragging : ""]
        .filter(Boolean)
        .join(" ")}
      onClick={onSelect}
      onPointerDown={onPointerDown}
    >
      <IndexPill value={displayIndex} color={color} />
      {thumbnailSrc && (
        <span className={styles.thumbnailWrap}>
          <img className={styles.thumbnail} src={thumbnailSrc} alt="" />
          <IconBtn
            fill="ghost"
            size="xs"
            className={styles.thumbnailClear}
            icon={<XMarkIcon />}
            aria-label={`Remove ${itemNoun.toLowerCase()} ${displayIndex.toString()} image`}
            onClick={(e) => {
              // Clicking anywhere on the row selects it — clearing must not.
              e.stopPropagation();
              onSetImage(emptyImage());
            }}
          />
        </span>
      )}
      {/* `ItemField`'s own wrapper is the flexible child — it takes the row's
          remaining width and anchors the popover. */}
      <ItemField
        itemId={item.id}
        label={item.label}
        image={item.image}
        displayIndex={displayIndex}
        placeholder={`${itemNoun} ${displayIndex.toString()}`}
        maxLength={labelMaxLength}
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
      {meta}
      {scored && (
        <span className={styles.scored} role="img" aria-label="Answer set">
          <CheckIcon className={styles.scoredIcon} aria-hidden="true" />
        </span>
      )}
      {grip}
    </div>
  );
};

/** The reorderable variant — for banks whose row order is itself meaningful
 *  (it fixes each item's number, and for Ranking it IS the answer; colors are
 *  the item's own and do not follow the row). The grip alone activates the
 *  drag, so typing in the label field never fights with it. */
const SortableRow = ({
  gripLabel,
  item,
  onSelect,
  ...rowProps
}: PlacementRowBaseProps & { item: Identified<PlaceableItem> }) => {
  const { ref, handleRef, isDragging } = useSortable({
    id: item.id,
    index: rowProps.index,
  });
  const clickGuard = useClickAfterDragGuard(isDragging, onSelect);

  return (
    <BaseRow
      {...rowProps}
      item={item}
      onSelect={clickGuard.onSelect}
      onPointerDown={clickGuard.onPointerDown}
      rootRef={ref}
      dragging={isDragging}
      grip={
        <span
          ref={handleRef}
          className={styles.grip}
          role="button"
          aria-label={
            gripLabel ??
            `Reorder ${rowProps.itemNoun.toLowerCase()} ${(rowProps.index + 1).toString()}`
          }
        >
          <DragIcon className={styles.gripIcon} aria-hidden="true" />
        </span>
      }
    />
  );
};

// Narrowed on `props` rather than a destructured `draggable`, so the union's
// promise — a draggable row's item carries an id — survives into `SortableRow`.
const PlacementRow = (props: PlacementRowProps) => {
  if (props.draggable === true) {
    const { draggable: _draggable, ...rowProps } = props;
    return <SortableRow {...rowProps} />;
  }
  const { draggable: _draggable, gripLabel: _gripLabel, ...rowProps } = props;
  return <BaseRow {...rowProps} />;
};

export { PlacementRow };
export type { PlacementRowProps };
