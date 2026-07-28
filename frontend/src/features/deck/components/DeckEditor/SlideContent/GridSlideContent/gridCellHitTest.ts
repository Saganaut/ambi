/**
 * Pointer position → the matrix cell under it, for the Grid editor's placement
 * gestures.
 *
 * The matrix is not the continuous space the other placement surfaces measure
 * in: its header row, its header column, and the gaps between cells all sit
 * inside its box yet belong to no cell. So a press is hit-tested against the
 * cells' own boxes rather than normalized against the surface's, and a miss is
 * a real answer — releasing on one cancels a fresh placement and unplaces a
 * chip dragged out — which is why there is no nearest-cell fallback.
 */

/**
 * Half-open on the far edges: two boxes sharing an edge can never both claim
 * the same point, so the scan order below cannot change the answer.
 */
const containsPoint = (rect: DOMRect, clientX: number, clientY: number): boolean =>
  clientX >= rect.left && clientX < rect.right && clientY >= rect.top && clientY < rect.bottom;

/**
 * The first cell whose box contains the point, or null when the point is in a
 * gap, on a header, or off the matrix entirely.
 *
 * Takes measured boxes rather than elements so the caller decides when to
 * measure — the hook feeds it a lazy sequence, so a hit stops the scan before
 * the rest of the matrix is measured at all.
 */
const cellAtPoint = (
  cellRects: Iterable<readonly [string, DOMRect]>,
  clientX: number,
  clientY: number,
): string | null => {
  for (const [cell, rect] of cellRects) {
    if (containsPoint(rect, clientX, clientY)) return cell;
  }
  return null;
};

export { cellAtPoint };
