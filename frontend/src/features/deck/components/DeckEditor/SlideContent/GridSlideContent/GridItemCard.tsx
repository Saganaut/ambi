/**
 * One placed (or unplaced) Grid item: a shared `PhraseOrImageCard` made
 * draggable by the grip slotted into the card footer, so the author can move
 * it between cells — the drop is resolved by the `DragDropProvider` in
 * `GridSlideContent`. Only the grip initiates a drag; the card's fields stay
 * plain editable. A controlled card: every write comes in as props from the
 * one `useGridEditor` in `GridSlideContent`.
 */
import { Bars2Icon } from "@heroicons/react/24/outline";
import { useDraggable } from "@dnd-kit/react";

import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { GRID_ITEM_LABEL_MAX } from "@deck/hooks/useGridEditor";
import type { AppImage, GridItem } from "@deck/store/deckApi.gen";
import { PhraseOrImageCard } from "../_shared";
import styles from "./GridSlideContent.module.css";

interface GridItemCardProps {
  item: GridItem;
  /** The item's position in the bank — palette default and display number. */
  itemIndex: number;
  /** Whether this item's popover menu is open (at most one per slide). */
  menuOpen: boolean;
  canRemove: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onScheduleLabel: (label: string) => void;
  onFlush: () => void;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  onRemove: () => void;
  openPicker: OpenGalleryPicker;
}

const GridItemCard = ({
  item,
  itemIndex,
  menuOpen,
  canRemove,
  onMenuOpenChange,
  onScheduleLabel,
  onFlush,
  onSetColor,
  onSetImage,
  onRemove,
  openPicker,
}: GridItemCardProps) => {
  const { ref, handleRef, isDragging } = useDraggable({ id: item.id ?? "" });
  const itemNumber = itemIndex + 1;

  return (
    <div ref={ref} className={isDragging ? styles.dragging : undefined}>
      <PhraseOrImageCard
        item={item}
        itemName={`item ${itemNumber.toString()}`}
        displayIndex={itemNumber.toString()}
        placeholder={`Item ${itemNumber.toString()}`}
        labelMaxLength={GRID_ITEM_LABEL_MAX}
        color={resolveDatumColor(item.color, itemIndex)}
        menuOpen={menuOpen}
        canRemove={canRemove}
        onMenuOpenChange={onMenuOpenChange}
        onScheduleLabel={onScheduleLabel}
        onFlush={onFlush}
        onSetColor={onSetColor}
        onSetImage={onSetImage}
        onRemove={onRemove}
        openPicker={openPicker}
        actions={
          <span
            ref={handleRef}
            className={styles.dragHandle}
            role="button"
            aria-label={`Move item ${itemNumber.toString()} to another cell`}
          >
            <Bars2Icon className={styles.dragHandleIcon} aria-hidden="true" />
          </span>
        }
      />
    </div>
  );
};

export { GridItemCard };
