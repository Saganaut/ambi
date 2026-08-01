// Covers the Place-on-Image surface's two press meanings and how they order:
// with a row armed, a press places THAT target and puts the row down again;
// with nothing armed it mints a new one. Also pins the marker tap that toggles
// arming, the unplaced target that draws no marker until it is dragged, and
// the miss semantics — a release off the image abandons a fresh placement
// (arming untouched) and unplaces a dragged marker.
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { PlaceItemView } from "@deck/hooks/usePlaceOnImageEditor";
import { PlaceOnImageSurface } from "./PlaceOnImageSurface";

/** A 200 × 100 image box at the viewport origin, so 50/25 normalizes to ¼, ¼. */
const SURFACE_BOX = {
  left: 0,
  top: 0,
  width: 200,
  height: 100,
  right: 200,
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

/** One unplaced target and one placed one — the two states a bank can hold. */
const TARGETS: PlaceItemView[] = [
  { id: "target_a", label: "Rivendell" },
  { id: "target_b", label: "Bree", x: 0.85, y: 0.3 },
];

interface SurfaceOptions {
  selectedItemId?: string | null;
  canAddTarget?: boolean;
}

const renderSurface = ({ selectedItemId = null, canAddTarget = true }: SurfaceOptions = {}) => {
  const handlers = {
    onToggleSelect: vi.fn(),
    onAddTarget: vi.fn(),
    onSetTargetPosition: vi.fn(),
  };
  const { container } = render(
    <PlaceOnImageSurface
      imageUrl="https://example.test/middle-earth.png"
      targets={TARGETS}
      tolerance={0.1}
      canAddTarget={canAddTarget}
      selectedItemId={selectedItemId}
      {...handlers}
    />,
  );
  const surface = container.firstElementChild;
  if (!surface) throw new Error("expected the surface to render");
  surface.getBoundingClientRect = () => SURFACE_BOX;
  return { ...handlers, surface };
};

/** A press and release at the same spot on the image. */
const pressSurface = (surface: Element, clientX = 50, clientY = 25) => {
  fireEvent.pointerDown(surface, { pointerId: 1, clientX, clientY });
  fireEvent.pointerUp(surface, { pointerId: 1, clientX, clientY });
};

describe("PlaceOnImageSurface", () => {
  it("mints a target where the image is pressed while nothing is armed", () => {
    const { surface, onAddTarget, onSetTargetPosition } = renderSurface();

    pressSurface(surface);

    expect(onAddTarget).toHaveBeenCalledWith({ x: 0.25, y: 0.25 });
    expect(onSetTargetPosition).not.toHaveBeenCalled();
  });

  it("places the armed row's target instead of minting a new one", () => {
    const { surface, onAddTarget, onSetTargetPosition } = renderSurface({
      selectedItemId: "target_a",
    });

    pressSurface(surface);

    // Arming wins over creation: the press belongs to the row the author picked
    // up, not to a target they never asked for.
    expect(onSetTargetPosition).toHaveBeenCalledWith("target_a", { x: 0.25, y: 0.25 });
    expect(onAddTarget).not.toHaveBeenCalled();
  });

  it("puts the armed row down once its target is placed", () => {
    const { surface, onToggleSelect } = renderSurface({ selectedItemId: "target_a" });

    pressSurface(surface);

    // Auto-disarm: the next press adds a target rather than silently relocating
    // the one just finished.
    expect(onToggleSelect).toHaveBeenCalledWith("target_a");
  });

  it("still places an armed row at the target cap, where minting is closed", () => {
    const { surface, onSetTargetPosition, onAddTarget } = renderSurface({
      selectedItemId: "target_a",
      canAddTarget: false,
    });

    pressSurface(surface);

    expect(onSetTargetPosition).toHaveBeenCalledWith("target_a", { x: 0.25, y: 0.25 });
    expect(onAddTarget).not.toHaveBeenCalled();
  });

  it("reads a tap on a placed marker as arming, not a nudge", () => {
    const { onToggleSelect, onSetTargetPosition, onAddTarget } = renderSurface();
    const marker = screen.getByRole("button", { name: "Target 2 (Bree) — drag to move" });

    fireEvent.pointerDown(marker, { pointerId: 1, clientX: 170, clientY: 30 });
    fireEvent.pointerUp(marker, { pointerId: 1, clientX: 171, clientY: 30 });

    expect(onToggleSelect).toHaveBeenCalledWith("target_b");
    expect(onSetTargetPosition).not.toHaveBeenCalled();
    expect(onAddTarget).not.toHaveBeenCalled();
  });

  it("abandons a mint released off the image", () => {
    const { surface, onAddTarget, onSetTargetPosition } = renderSurface();

    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 50, clientY: 25 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 300, clientY: 25 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 300, clientY: 25 });

    expect(onAddTarget).not.toHaveBeenCalled();
    expect(onSetTargetPosition).not.toHaveBeenCalled();
  });

  it("keeps the armed row armed when its placement is released off the image", () => {
    const { surface, onSetTargetPosition, onToggleSelect } = renderSurface({
      selectedItemId: "target_a",
    });

    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 50, clientY: 25 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 300, clientY: 25 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 300, clientY: 25 });

    // Nothing written, nothing disarmed: the author still holds the row.
    expect(onSetTargetPosition).not.toHaveBeenCalled();
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it("unplaces a placed marker dragged off the image", () => {
    const { onSetTargetPosition } = renderSurface();
    const marker = screen.getByRole("button", { name: "Target 2 (Bree) — drag to move" });

    fireEvent.pointerDown(marker, { pointerId: 1, clientX: 170, clientY: 30 });
    fireEvent.pointerMove(marker, { pointerId: 1, clientX: 400, clientY: 300 });
    fireEvent.pointerUp(marker, { pointerId: 1, clientX: 400, clientY: 300 });

    expect(onSetTargetPosition).toHaveBeenCalledWith("target_b", null);
  });

  it("draws no marker for an unplaced target until its drag materializes one", () => {
    const { surface } = renderSurface({ selectedItemId: "target_a" });
    const markerName = "Target 1 (Rivendell) — drag to move";

    // No answer-key point, so nothing is drawn at a made-up coordinate.
    expect(screen.queryByRole("button", { name: markerName })).not.toBeInTheDocument();

    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 50, clientY: 25 });

    // Mid-drag the live point stands in, so the author sees what they are placing.
    expect(screen.getByRole("button", { name: markerName })).toBeInTheDocument();
  });
});
