// Covers the continuous surfaces' placement gesture: a press normalized (and
// clamped) against the surface's box, the single commit on release, and the
// Grid-parity miss semantics — a fresh placement released off the surface is
// abandoned, a marker dragged off is unplaced (committed as null).
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { NormalizedPoint } from "./placement.types";
import { usePlacementSurface } from "./usePlacementSurface";

/** A 100 × 100 surface at the viewport origin, so coordinates read as fractions. */
const SURFACE_BOX = {
  left: 0,
  top: 0,
  width: 100,
  height: 100,
  right: 100,
  bottom: 100,
} as DOMRect;

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
  invertY?: boolean;
  armedKey: string | null;
  onSurfaceCommit: (key: string, point: NormalizedPoint) => void;
  onMarkerCommit: (key: string, point: NormalizedPoint | null) => void;
  onMarkerTap: (key: string) => void;
}

const Harness = ({ invertY = false, armedKey, ...handlers }: HarnessProps) => {
  const surface = usePlacementSurface({ invertY, pendingKey: () => armedKey, ...handlers });

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      data-testid="surface"
      ref={(element) => {
        if (element) element.getBoundingClientRect = () => SURFACE_BOX;
        surface.surfaceRef.current = element;
      }}
      {...surface.surfaceProps}
    >
      <button type="button" data-testid="marker" {...surface.markerProps("item-1")}>
        marker
      </button>
      <span data-testid="carried">
        {surface.drag
          ? `${surface.drag.key}@${surface.drag.point.x.toString()},${surface.drag.point.y.toString()}${surface.drag.inside ? "" : " out"}`
          : "idle"}
      </span>
    </div>
  );
};

const renderHarness = (armedKey: string | null = null, invertY = false) => {
  const handlers = { onSurfaceCommit: vi.fn(), onMarkerCommit: vi.fn(), onMarkerTap: vi.fn() };
  render(<Harness invertY={invertY} armedKey={armedKey} {...handlers} />);
  return {
    ...handlers,
    surface: screen.getByTestId("surface"),
    marker: screen.getByTestId("marker"),
    carried: () => screen.getByTestId("carried").textContent,
  };
};

describe("usePlacementSurface", () => {
  it("carries the armed key to the normalized point it is released at", () => {
    const { surface, onSurfaceCommit, carried } = renderHarness("item-1");

    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 20, clientY: 40 });
    expect(carried()).toBe("item-1@0.2,0.4");

    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 60, clientY: 80 });
    // Commit once, on release: a drag never writes as it goes.
    expect(onSurfaceCommit).not.toHaveBeenCalled();

    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 60, clientY: 80 });
    expect(onSurfaceCommit).toHaveBeenCalledTimes(1);
    expect(onSurfaceCommit).toHaveBeenCalledWith("item-1", { x: 0.6, y: 0.8 });
    expect(carried()).toBe("idle");
  });

  it("measures from the bottom-left when the surface inverts y", () => {
    const { surface, onSurfaceCommit } = renderHarness("item-1", true);

    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 20, clientY: 25 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 20, clientY: 25 });

    expect(onSurfaceCommit).toHaveBeenCalledWith("item-1", { x: 0.2, y: 0.75 });
  });

  it("rides the edge, flagged outside, while the drag leaves the surface", () => {
    const { surface, carried } = renderHarness("item-1");

    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 20, clientY: 40 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 150, clientY: 50 });

    // The live point clamps to the border so the marker stays visible.
    expect(carried()).toBe("item-1@1,0.5 out");
  });

  it("abandons a placement released off the surface", () => {
    const { surface, onSurfaceCommit, carried } = renderHarness("item-1");

    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 20, clientY: 40 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 150, clientY: 50 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 150, clientY: 50 });

    expect(onSurfaceCommit).not.toHaveBeenCalled();
    expect(carried()).toBe("idle");
  });

  it("stays inert while nothing is armed", () => {
    const { surface, onSurfaceCommit, carried } = renderHarness(null);

    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 20, clientY: 40 });
    expect(carried()).toBe("idle");

    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 20, clientY: 40 });
    expect(onSurfaceCommit).not.toHaveBeenCalled();
  });

  it("moves a dragged marker to the point it is released at", () => {
    const { marker, onMarkerCommit, onMarkerTap } = renderHarness(null);

    fireEvent.pointerDown(marker, { pointerId: 1, clientX: 20, clientY: 40 });
    fireEvent.pointerMove(marker, { pointerId: 1, clientX: 60, clientY: 80 });
    fireEvent.pointerUp(marker, { pointerId: 1, clientX: 60, clientY: 80 });

    expect(onMarkerCommit).toHaveBeenCalledTimes(1);
    expect(onMarkerCommit).toHaveBeenCalledWith("item-1", { x: 0.6, y: 0.8 });
    expect(onMarkerTap).not.toHaveBeenCalled();
  });

  it("unplaces a marker dragged off the surface", () => {
    const { marker, onMarkerCommit } = renderHarness(null);

    fireEvent.pointerDown(marker, { pointerId: 1, clientX: 20, clientY: 40 });
    fireEvent.pointerMove(marker, { pointerId: 1, clientX: 600, clientY: 600 });
    fireEvent.pointerUp(marker, { pointerId: 1, clientX: 600, clientY: 600 });

    expect(onMarkerCommit).toHaveBeenCalledTimes(1);
    expect(onMarkerCommit).toHaveBeenCalledWith("item-1", null);
  });

  it("reads a press that barely travels as a tap, not a nudge", () => {
    const { marker, onMarkerCommit, onMarkerTap } = renderHarness(null);

    fireEvent.pointerDown(marker, { pointerId: 1, clientX: 20, clientY: 40 });
    fireEvent.pointerMove(marker, { pointerId: 1, clientX: 22, clientY: 41 });
    fireEvent.pointerUp(marker, { pointerId: 1, clientX: 22, clientY: 41 });

    expect(onMarkerTap).toHaveBeenCalledTimes(1);
    expect(onMarkerTap).toHaveBeenCalledWith("item-1");
    expect(onMarkerCommit).not.toHaveBeenCalled();
  });
});
