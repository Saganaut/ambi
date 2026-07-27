/**
 * An item's token inside a matrix cell: the compact counterpart of its row in
 * the "Items" column, carrying the same 1-based number and resolved color so
 * the two read as one item. The whole chip is the drag source (there is no
 * room for a separate grip at this size) — drag it to another cell to move the
 * placement, or onto the "Items" column to unplace it.
 *
 * Clicking arms the item instead, the pointer-free path's other half: an armed
 * item is placed by pressing a cell's "Place here" button. A quick click never
 * crosses dnd-kit's pointer-sensor threshold, so the two inputs never conflict.
 */
import { useDraggable } from "@dnd-kit/react";
import type { CSSProperties } from "react";

import type { GridItem } from "@deck/store/deckApi.gen";
import { resolveImageUrl } from "@utils/image";
import { chipDragId } from "./gridDragIds";
import styles from "./GridSlideContent.module.css";

interface GridCellChipProps {
  item: GridItem;
  /** 0-based position in the item list — the chip's number and palette default. */
  index: number;
  /** Resolved item color, shared with the row's index pill. */
  color: string;
  /** Whether this item is armed for placement. */
  selected: boolean;
  onSelect: () => void;
}

const GridCellChip = ({ item, index, color, selected, onSelect }: GridCellChipProps) => {
  const { ref, isDragging } = useDraggable({ id: chipDragId(item.id ?? "") });
  const displayIndex = index + 1;
  const label = item.label?.trim();
  const thumbnailSrc = resolveImageUrl(item.image, "SM", item.id ?? "", 200, 200, false);

  return (
    <button
      ref={ref}
      type="button"
      className={[styles.chip, isDragging ? styles.chipDragging : ""].filter(Boolean).join(" ")}
      style={{ "--chip-accent": color } as CSSProperties}
      aria-pressed={selected}
      aria-label={`Item ${displayIndex.toString()}${label ? ` (${label})` : ""} — drag to another cell`}
      onClick={onSelect}
    >
      <span className={styles.chipIndex}>{displayIndex}</span>
      {thumbnailSrc && <img className={styles.chipImage} src={thumbnailSrc} alt="" />}
      {label && <span className={styles.chipLabel}>{label}</span>}
    </button>
  );
};

export { GridCellChip };
