/**
 * An item's token inside a matrix cell: `MarkerBadge` — the same numbered disc,
 * resolved color, and pill the item shows wherever it is placed — wrapped in a
 * button the pointer grabs. The wrapper adds nothing to the look: the whole
 * chip is the drag source (there is no room for a separate grip at this size),
 * so press it and drag to another cell to move the placement, or off the matrix
 * to unplace it.
 *
 * A press that never travels is a tap that arms/disarms the item instead —
 * settled on `pointerup` by the placement gesture, which is why the click here
 * only serves the keyboard: `detail === 0` marks the activation that sent no
 * pointer events (Enter/Space), the one case the gesture never saw.
 */
import type { PointerEventHandler } from "react";

import type { GridItem } from "@deck/store/deckApi.gen";
import { MarkerBadge } from "@ui/MarkerBadge/MarkerBadge";
import styles from "./GridSlideContent.module.css";

interface GridCellChipProps {
  item: GridItem;
  /** 0-based position in the item list — the chip's number and palette default. */
  index: number;
  /** Resolved item color, shared with the row's index pill. */
  color: string;
  /** Whether this item is armed for placement. */
  selected: boolean;
  /** Whether this chip's ghost is currently following the pointer. */
  dragging: boolean;
  /** Arm/disarm the item — keyboard activation only (see the header). */
  onSelect: () => void;
  onPointerDown?: PointerEventHandler<HTMLElement>;
  onPointerMove?: PointerEventHandler<HTMLElement>;
  onPointerUp?: PointerEventHandler<HTMLElement>;
}

const GridCellChip = ({
  item,
  index,
  color,
  selected,
  dragging,
  onSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: GridCellChipProps) => {
  const displayIndex = index + 1;
  const label = item.label?.trim();

  return (
    <button
      type="button"
      className={[styles.chip, dragging ? styles.chipGhosted : ""].filter(Boolean).join(" ")}
      aria-pressed={selected}
      aria-label={`Item ${displayIndex.toString()}${label ? ` (${label})` : ""} — drag to a cell`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={(event) => {
        // Selection is settled on pointerup; keep the click from falling
        // through to the matrix and from toggling the selection back.
        event.stopPropagation();
        if (event.detail === 0) onSelect();
      }}
    >
      <MarkerBadge className={styles.chipBadge} displayIndex={displayIndex} color={color} label={label} />
    </button>
  );
};

export { GridCellChip };
