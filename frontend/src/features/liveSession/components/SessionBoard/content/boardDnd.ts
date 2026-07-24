// Shared seam for drag-and-drop on the live-session board content surfaces
// (GridBoardContent today; MatchingBoardContent, AxisBoardContent,
// RankingBoardContent… next). Every board wraps its droppable regions and its
// draggable item chips in one `DragDropProvider` and reads the drop through
// `resolveDragEnd`, which owns the framework-shaped guards (canceled drag,
// missing/undefined source or target, non-string ids). The board-specific
// placement semantics — what a given target id *means*, and whether a drop is a
// no-op — stay in the component that knows its own model.
import type { DragEndEvent } from "@dnd-kit/react";

// Reserved droppable id for the item bank. Item ids are backend-generated
// UUIDs and cell ids always contain a comma (the `"row,col"` shape), so a plain
// comma-free sentinel can never collide with either an item or a cell id.
export const BANK_DROPPABLE_ID = "bank";

/** A resolved drop: the dragged item and the id of the region it landed on. */
export interface BoardDragResolution {
  itemId: string;
  /** A board-defined target id (a cell id, {@link BANK_DROPPABLE_ID}, …). */
  targetId: string;
}

/**
 * Reduce a dnd-kit drag-end event to the item that moved and where it landed,
 * or `null` when the drag was canceled, dropped outside any droppable, or
 * carried non-string ids. Whether the resolved target actually changes
 * anything (a same-cell drop, a bank item dropped back on the bank) is the
 * caller's concern — this only strips the framework envelope.
 */
export const resolveDragEnd = (event: DragEndEvent): BoardDragResolution | null => {
  if (event.canceled) return null;
  const itemId = event.operation.source?.id;
  const targetId = event.operation.target?.id;
  if (typeof itemId !== "string" || typeof targetId !== "string") return null;
  return { itemId, targetId };
};
