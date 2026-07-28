// Covers the Grid matrix's pointer hit-test: which cell a point lands in, and
// the misses that mean something — the header lanes, the gaps between cells,
// and off the matrix entirely.
import { describe, expect, it } from "vitest";

import { cellAtPoint } from "./gridCellHitTest";

const box = (left: number, top: number, width: number, height: number): DOMRect =>
  ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;

/** A 2 × 2 matrix at (100, 100): 80 px cells with a 20 px gap between them. */
const cells = (): (readonly [string, DOMRect])[] => [
  ["0,0", box(100, 100, 80, 80)],
  ["0,1", box(200, 100, 80, 80)],
  ["1,0", box(100, 200, 80, 80)],
  ["1,1", box(200, 200, 80, 80)],
];

describe("cellAtPoint", () => {
  it("finds the cell a point lands inside", () => {
    expect(cellAtPoint(cells(), 140, 140)).toBe("0,0");
    expect(cellAtPoint(cells(), 240, 240)).toBe("1,1");
  });

  it("claims a cell's leading edges and leaves its trailing ones to the gap", () => {
    expect(cellAtPoint(cells(), 100, 100)).toBe("0,0");
    expect(cellAtPoint(cells(), 180, 140)).toBeNull();
    expect(cellAtPoint(cells(), 140, 180)).toBeNull();
  });

  it("reports no cell for the gaps between them", () => {
    expect(cellAtPoint(cells(), 190, 140)).toBeNull();
    expect(cellAtPoint(cells(), 140, 190)).toBeNull();
  });

  it("reports no cell for the header lanes and for points off the matrix", () => {
    expect(cellAtPoint(cells(), 140, 40)).toBeNull();
    expect(cellAtPoint(cells(), 40, 140)).toBeNull();
    expect(cellAtPoint(cells(), 900, 900)).toBeNull();
  });

  it("reports no cell when nothing is registered", () => {
    expect(cellAtPoint([], 140, 140)).toBeNull();
  });

  it("stops measuring once a cell claims the point", () => {
    const measured: string[] = [];
    function* lazily(): Generator<readonly [string, DOMRect]> {
      for (const [cell, rect] of cells()) {
        measured.push(cell);
        yield [cell, rect];
      }
    }

    expect(cellAtPoint(lazily(), 240, 140)).toBe("0,1");
    expect(measured).toEqual(["0,0", "0,1"]);
  });
});
