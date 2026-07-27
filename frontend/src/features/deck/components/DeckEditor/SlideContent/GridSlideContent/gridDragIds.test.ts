// Pins the Grid editor's two-drag-sources-per-item id convention: a chip id
// round-trips back to its item, a bare row id passes through untouched, and a
// cell id ("rowIndex,colIndex") can never be mistaken for a chip id.
import { describe, expect, it } from "vitest";

import { PLACED_CHIP_PREFIX, chipDragId, itemIdFromDragId } from "./gridDragIds";

describe("gridDragIds", () => {
  it("round-trips a placed chip's drag id back to its item id", () => {
    const itemId = "2f1c0d5e-9c2a-4a7e-8f10-1b2c3d4e5f60";
    const dragId = chipDragId(itemId);

    expect(dragId).toBe(`${PLACED_CHIP_PREFIX}${itemId}`);
    expect(itemIdFromDragId(dragId)).toBe(itemId);
  });

  it("passes a bare row drag id (the item id itself) straight through", () => {
    expect(itemIdFromDragId("it_a")).toBe("it_a");
  });

  it("never mistakes a cell id for a chip id", () => {
    expect(itemIdFromDragId("1,2")).toBe("1,2");
    expect(chipDragId("it_a")).not.toBe("1,2");
  });
});
