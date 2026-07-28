/**
 * The one row every item-bank slide editor lists — Axis, Grid, Ranking, and
 * Place-on-Image. Left to right: the colored index pill, the item's image
 * thumbnail when it has one, the editable label field with its popover menu,
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
 *
 * `useSortable` cannot be switched on and off by a prop, so `draggable` picks
 * between two private components at the top of `PlacementRow`; both render the
 * same private base row, which keeps this file to one public export.
 */
import { useSortable } from "@dnd-kit/react/sortable";
import type { ReactNode, Ref } from "react";

import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import CheckIcon from "@assets/icons/status/check-solid.svg?react";
import DragIcon from "@assets/icons/action/drag.svg?react";
import type { AppImage } from "@deck/store/deckApi.gen";
import { resolveImageUrl } from "@utils/image";
import { IndexPill } from "../IndexPill/IndexPill";
import { ItemField } from "../ItemField/ItemField";
import type { OptionMenuPrimaryAction } from "../OptionMenu/OptionMenu.types";
import type { PlaceableItem } from "../placement/placement.types";
import styles from "./PlacementRow.module.css";

interface PlacementRowProps {
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
  /** Whether the row can be dragged to reorder its list. */
  draggable?: boolean;
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

/** The base row's own props: the public set minus the two drag switches, plus
 *  the sortable wiring `SortableRow` injects (nothing when it isn't used). */
interface BaseRowProps extends Omit<PlacementRowProps, "draggable" | "gripLabel"> {
  rootRef?: Ref<HTMLDivElement>;
  grip?: ReactNode;
  dragging?: boolean;
}

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
    >
      <IndexPill value={displayIndex} color={color} />
      {thumbnailSrc && <img className={styles.thumbnail} src={thumbnailSrc} alt="" />}
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
 *  (it fixes each item's number and palette color, and for Ranking it IS the
 *  answer). The grip alone activates the drag, so typing in the label field
 *  never fights with it. */
const SortableRow = ({ gripLabel, ...rowProps }: Omit<PlacementRowProps, "draggable">) => {
  const { ref, handleRef, isDragging } = useSortable({
    id: rowProps.item.id ?? "",
    index: rowProps.index,
  });

  return (
    <BaseRow
      {...rowProps}
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

const PlacementRow = ({ draggable = false, gripLabel, ...rowProps }: PlacementRowProps) =>
  draggable ? <SortableRow {...rowProps} gripLabel={gripLabel} /> : <BaseRow {...rowProps} />;

export { PlacementRow };
export type { PlacementRowProps };
