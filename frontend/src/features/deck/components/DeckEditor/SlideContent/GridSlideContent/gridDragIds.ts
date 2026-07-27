/**
 * dnd-kit drag ids for the Grid author surface, where one item is draggable
 * from two places at once: its row in the "Items" column (dragged by the grip)
 * and, once placed, its chip inside a cell. dnd-kit ids must be unique across a
 * single `DragDropProvider`, so the row keeps the bare item id and the chip
 * takes a prefixed one.
 *
 * The prefix is colon-delimited, which nothing else in this surface can carry:
 * item ids are minted UUIDs and cell ids are always `"rowIndex,colIndex"`. So
 * `itemIdFromDragId` can strip it unconditionally without ever mangling a bare
 * id it is handed.
 */

/** Marks a drag id as coming from an item's placed chip rather than its row. */
const PLACED_CHIP_PREFIX = "placed:";

/** The drag id for an item's chip inside a cell. */
const chipDragId = (itemId: string): string => `${PLACED_CHIP_PREFIX}${itemId}`;

/** The item behind a drag id, whichever of the two drag sources it came from. */
const itemIdFromDragId = (dragId: string): string =>
  dragId.startsWith(PLACED_CHIP_PREFIX) ? dragId.slice(PLACED_CHIP_PREFIX.length) : dragId;

export { PLACED_CHIP_PREFIX, chipDragId, itemIdFromDragId };
