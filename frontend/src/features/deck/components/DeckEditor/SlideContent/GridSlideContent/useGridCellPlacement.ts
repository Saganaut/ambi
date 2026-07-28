/**
 * Grid's placement gestures: the shared pointer machinery of
 * `usePointerPlacement`, resolved to a matrix cell instead of a point.
 *
 * A press with an item armed, or on a placed chip, drags a ghost that follows
 * the pointer everywhere — including the header row, the gaps, and off the
 * matrix — so the resolved value always exists and carries the cell under the
 * pointer as `null` when there is none. What that miss means is decided on
 * release, and differs by gesture: a fresh placement is simply cancelled (the
 * item stays armed, nothing is written), while a chip dragged off its cell is
 * unplaced. Both commit exactly once, on release.
 *
 * Cells register their elements here rather than being measured from the
 * matrix's own box, because the header lane widths and the inter-cell gaps are
 * layout the grid template owns and this hook has no business re-deriving.
 */
import { useRef } from "react";

import {
  usePointerPlacement,
  type PointerPlacement,
  type SurfacePointerHandlers,
} from "../_shared";
import { cellAtPoint } from "./gridCellHitTest";

/** Where a grid placement currently is: under the pointer, over a cell or not. */
interface GridCellPlacement {
  /** Viewport coordinates, for the ghost that follows the pointer. */
  clientX: number;
  clientY: number;
  /** The cell under the pointer, or null when it is over none. */
  cell: string | null;
}

interface UseGridCellPlacementOptions {
  /** The item armed for placement, or null when nothing is armed. */
  armedItemId: string | null;
  /** Release over a cell with an item armed; a release elsewhere never lands here. */
  onPlace: (itemId: string, cell: string) => void;
  /** Release after dragging a placed chip: a cell moves it, null unplaces it. */
  onMoveChip: (itemId: string, cell: string | null) => void;
  /** A chip pressed without dragging — arms or disarms its item. */
  onTapChip: (itemId: string) => void;
}

interface UseGridCellPlacementResult {
  /** Ref callback for a cell, registering its box for hit-testing. */
  registerCell: (cell: string) => (element: HTMLElement | null) => void;
  /** Spread on the matrix: a press with an item armed starts a placement. */
  matrixProps: SurfacePointerHandlers;
  /** Spread on a placed chip: press-drag moves it, a tap selects it. */
  chipProps: (itemId: string) => SurfacePointerHandlers;
  /** The placement in flight — its item and where the pointer is — else null. */
  drag: PointerPlacement<GridCellPlacement> | null;
}

/** Measures the registered cells lazily, so a hit stops the scan early. */
function* measure(cells: Map<string, HTMLElement>): Generator<readonly [string, DOMRect]> {
  for (const [cell, element] of cells) yield [cell, element.getBoundingClientRect()] as const;
}

const useGridCellPlacement = ({
  armedItemId,
  onPlace,
  onMoveChip,
  onTapChip,
}: UseGridCellPlacementOptions): UseGridCellPlacementResult => {
  const cellsRef = useRef(new Map<string, HTMLElement>());

  const placement = usePointerPlacement<GridCellPlacement>({
    resolve: (clientX, clientY) => ({
      clientX,
      clientY,
      cell: cellAtPoint(measure(cellsRef.current), clientX, clientY),
    }),
    pendingKey: () => armedItemId,
    onSurfaceCommit: (itemId, { cell }) => {
      // Released over no cell: the placement is abandoned, not written.
      if (cell != null) onPlace(itemId, cell);
    },
    onMarkerCommit: (itemId, { cell }) => {
      onMoveChip(itemId, cell);
    },
    onMarkerTap: onTapChip,
  });

  return {
    registerCell: (cell) => (element) => {
      if (element) cellsRef.current.set(cell, element);
      else cellsRef.current.delete(cell);
    },
    matrixProps: placement.surfaceProps,
    chipProps: placement.markerProps,
    drag: placement.drag,
  };
};

export { useGridCellPlacement };
export type { GridCellPlacement, UseGridCellPlacementOptions, UseGridCellPlacementResult };
