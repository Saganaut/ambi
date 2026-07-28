/**
 * One row in a placement editor's item list: the colored index pill, the label
 * field with its popover menu, an image thumbnail when one is set, and an
 * optional trailing meta slot (e.g. Grid's cell name).
 *
 * Purely presentational and free of drag machinery — `SortablePlacementRow` is
 * the thin dnd wrapper that feeds this row a `rootRef`, a `grip`, and a
 * `dragging` flag, so a list that doesn't reorder can render the row bare.
 *
 * Clicking anywhere on the row selects it; the keyboard path is focusing the
 * label field, which both selects the row (via `onMenuOpenChange`) and opens
 * its menu — hence the two a11y suppressions here rather than at each editor.
 */
import type { ReactNode, Ref } from "react";

import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import type { AppImage } from "@deck/store/deckApi.gen";
import { resolveImageUrl } from "@utils/image";
import { ItemCard } from "../ItemCard";
import { ItemField } from "../ItemField/ItemField";
import type { OptionMenuPrimaryAction } from "../OptionMenu/OptionMenu.types";
import type { PlaceableItem } from "./placement.types";
import styles from "../_shared.module.css";

interface PlacementItemRowProps {
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
  /** The kind-specific leading menu action (set target, clear cell, …). */
  primaryAction?: OptionMenuPrimaryAction;
  /** Drag grip, supplied by a dnd wrapper. */
  grip?: ReactNode;
  rootRef?: Ref<HTMLDivElement>;
  dragging?: boolean;
  /** Trailing status text inside the row (e.g. which cell an item sits in). */
  meta?: ReactNode;
  onSelect?: () => void;
  onMenuOpenChange: (open: boolean) => void;
  onScheduleLabel: (label: string) => void;
  onFlush: () => void;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  onRemove: () => void;
  openPicker: OpenGalleryPicker;
}

const PlacementItemRow = ({
  item,
  index,
  color,
  itemNoun,
  labelMaxLength,
  selected = false,
  menuOpen,
  canRemove,
  primaryAction,
  grip,
  rootRef,
  dragging = false,
  meta,
  onSelect,
  onMenuOpenChange,
  onScheduleLabel,
  onFlush,
  onSetColor,
  onSetImage,
  onRemove,
  openPicker,
}: PlacementItemRowProps) => {
  const displayIndex = index + 1;
  const thumbnailSrc = resolveImageUrl(item.image, "SM", item.id ?? "", 200, 200, false);

  return (
    // Row-wide selection target; the keyboard path is the label field's focus.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div ref={rootRef} className={dragging ? styles.dragging : undefined} onClick={onSelect}>
      <ItemCard index={index} active={selected} indexColor={color} actions={grip}>
        <div className={styles.itemFields}>
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
          {thumbnailSrc && <img className={styles.itemThumbnail} src={thumbnailSrc} alt="" />}
          {meta}
        </div>
      </ItemCard>
    </div>
  );
};

export { PlacementItemRow };
export type { PlacementItemRowProps };
