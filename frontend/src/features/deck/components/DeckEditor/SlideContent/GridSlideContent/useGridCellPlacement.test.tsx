// Covers the Grid editor's placement gesture: an armed item placed by pressing
// the matrix, a placed chip dragged between cells or off the matrix to unplace
// it, the tap that only selects, and the single commit on release.
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { useGridCellPlacement } from "./useGridCellPlacement";

/** Two 100 px cells at y 0–100, with a 20 px gap between them. */
const CELL_BOXES: Record<string, DOMRect> = {
  "0,0": { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 } as DOMRect,
  "0,1": { left: 120, top: 0, width: 100, height: 100, right: 220, bottom: 100 } as DOMRect,
};

// jsdom implements neither side of pointer capture; the gesture only ever asks
// "is this pointer still mine?", so a per-element id set is a faithful stand-in.
beforeAll(() => {
  const captured = new WeakMap<Element, Set<number>>();
  Element.prototype.setPointerCapture = function setPointerCapture(pointerId: number) {
    const ids = captured.get(this) ?? new Set<number>();
    ids.add(pointerId);
    captured.set(this, ids);
  };
  Element.prototype.releasePointerCapture = function releasePointerCapture(pointerId: number) {
    captured.get(this)?.delete(pointerId);
  };
  Element.prototype.hasPointerCapture = function hasPointerCapture(pointerId: number) {
    return captured.get(this)?.has(pointerId) ?? false;
  };
});

interface HarnessProps {
  armedItemId: string | null;
  onPlace: (itemId: string, cell: string) => void;
  onMoveChip: (itemId: string, cell: string | null) => void;
  onTapChip: (itemId: string) => void;
}

const Harness = (props: HarnessProps) => {
  const gesture = useGridCellPlacement(props);

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div data-testid="matrix" {...gesture.matrixProps}>
      {Object.entries(CELL_BOXES).map(([cell, box]) => (
        <div
          key={cell}
          data-testid={`cell-${cell}`}
          ref={(element) => {
            if (element) element.getBoundingClientRect = () => box;
            gesture.registerCell(cell)(element);
          }}
        />
      ))}
      <button type="button" data-testid="chip" {...gesture.chipProps("item-1")}>
        chip
      </button>
      <span data-testid="carried">
        {gesture.drag ? `${gesture.drag.key}@${gesture.drag.value.cell ?? "nowhere"}` : "idle"}
      </span>
    </div>
  );
};

const renderHarness = (armedItemId: string | null = null) => {
  const handlers = { onPlace: vi.fn(), onMoveChip: vi.fn(), onTapChip: vi.fn() };
  render(<Harness armedItemId={armedItemId} {...handlers} />);
  return {
    ...handlers,
    matrix: screen.getByTestId("matrix"),
    chip: screen.getByTestId("chip"),
    carried: () => screen.getByTestId("carried").textContent,
  };
};

describe("useGridCellPlacement", () => {
  it("carries the armed item to the cell it is released over", () => {
    const { matrix, onPlace, carried } = renderHarness("item-1");

    fireEvent.pointerDown(matrix, { pointerId: 1, clientX: 20, clientY: 20 });
    expect(carried()).toBe("item-1@0,0");

    fireEvent.pointerMove(matrix, { pointerId: 1, clientX: 150, clientY: 50 });
    expect(carried()).toBe("item-1@0,1");
    // Commit once, on release: a drag never writes as it goes.
    expect(onPlace).not.toHaveBeenCalled();

    fireEvent.pointerUp(matrix, { pointerId: 1, clientX: 150, clientY: 50 });
    expect(onPlace).toHaveBeenCalledTimes(1);
    expect(onPlace).toHaveBeenCalledWith("item-1", "0,1");
    expect(carried()).toBe("idle");
  });

  it("abandons a placement released over no cell", () => {
    const { matrix, onPlace, carried } = renderHarness("item-1");

    fireEvent.pointerDown(matrix, { pointerId: 1, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(matrix, { pointerId: 1, clientX: 110, clientY: 50 });
    expect(carried()).toBe("item-1@nowhere");

    fireEvent.pointerUp(matrix, { pointerId: 1, clientX: 110, clientY: 50 });
    expect(onPlace).not.toHaveBeenCalled();
    expect(carried()).toBe("idle");
  });

  it("stays inert while nothing is armed", () => {
    const { matrix, onPlace, carried } = renderHarness(null);

    fireEvent.pointerDown(matrix, { pointerId: 1, clientX: 20, clientY: 20 });
    expect(carried()).toBe("idle");

    fireEvent.pointerUp(matrix, { pointerId: 1, clientX: 20, clientY: 20 });
    expect(onPlace).not.toHaveBeenCalled();
  });

  it("moves a placed chip to the cell it is released over", () => {
    const { chip, onMoveChip, onTapChip, carried } = renderHarness(null);

    fireEvent.pointerDown(chip, { pointerId: 1, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(chip, { pointerId: 1, clientX: 150, clientY: 50 });
    expect(carried()).toBe("item-1@0,1");

    fireEvent.pointerUp(chip, { pointerId: 1, clientX: 150, clientY: 50 });
    expect(onMoveChip).toHaveBeenCalledTimes(1);
    expect(onMoveChip).toHaveBeenCalledWith("item-1", "0,1");
    expect(onTapChip).not.toHaveBeenCalled();
  });

  it("unplaces a chip dragged off the matrix", () => {
    const { chip, onMoveChip } = renderHarness(null);

    fireEvent.pointerDown(chip, { pointerId: 1, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(chip, { pointerId: 1, clientX: 600, clientY: 600 });
    fireEvent.pointerUp(chip, { pointerId: 1, clientX: 600, clientY: 600 });

    expect(onMoveChip).toHaveBeenCalledTimes(1);
    expect(onMoveChip).toHaveBeenCalledWith("item-1", null);
  });

  it("reads a press that barely travels as a tap, not a nudge", () => {
    const { chip, onMoveChip, onTapChip } = renderHarness(null);

    fireEvent.pointerDown(chip, { pointerId: 1, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(chip, { pointerId: 1, clientX: 22, clientY: 21 });
    fireEvent.pointerUp(chip, { pointerId: 1, clientX: 22, clientY: 21 });

    expect(onTapChip).toHaveBeenCalledTimes(1);
    expect(onTapChip).toHaveBeenCalledWith("item-1");
    expect(onMoveChip).not.toHaveBeenCalled();
  });

  it("keeps a press on a chip from also placing the armed item", () => {
    const { chip, onPlace, carried } = renderHarness("item-2");

    fireEvent.pointerDown(chip, { pointerId: 1, clientX: 20, clientY: 20 });
    expect(carried()).toBe("idle");

    fireEvent.pointerUp(chip, { pointerId: 1, clientX: 20, clientY: 20 });
    expect(onPlace).not.toHaveBeenCalled();
  });
});
