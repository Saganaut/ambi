// Unit tests for PlacementSurface — the reason it exists is that the board
// needs the same element twice: as dnd-kit's droppable AND as the box it
// measures to normalize a drop coordinate. So the tests pin the ref merge (the
// forwarded ref really lands on the rendered element, and it is the element the
// children live in), that the board's own surface chrome survives, and that the
// shared sentinel stays distinct from the ids it shares a drag context with.
import { describe, it, expect } from "vitest";
import { useRef, type RefObject } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { render, screen } from "@testing-library/react";
import { BANK_DROPPABLE_ID } from "@utils/dragDrop";
import { PlacementSurface, SURFACE_DROPPABLE_ID } from "./PlacementSurface";

/** Somewhere for the harness to hand the board-side ref back to the test. */
interface RefHolder {
  surfaceRef: RefObject<HTMLDivElement | null> | null;
}

interface HarnessProps {
  holder: RefHolder;
  className?: string;
}

/**
 * Mounts the surface the way a board does — owning the measurement ref itself —
 * and parks that ref in {@link RefHolder} so the test can assert what it was
 * pointed at.
 */
const Harness = ({ holder, className }: HarnessProps) => {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  holder.surfaceRef = surfaceRef;
  return (
    <DragDropProvider>
      <PlacementSurface surfaceRef={surfaceRef} dropDisabled={false} className={className}>
        <span data-testid="surfaceChild">child</span>
      </PlacementSurface>
    </DragDropProvider>
  );
};

describe("PlacementSurface", () => {
  it("points the board's measurement ref at the element holding the children", () => {
    const holder: RefHolder = { surfaceRef: null };
    render(<Harness holder={holder} />);

    const surface = holder.surfaceRef?.current ?? null;
    expect(surface).toBeInstanceOf(HTMLDivElement);
    expect(screen.getByTestId("surfaceChild").parentElement).toBe(surface);
  });

  it("keeps the board's own surface chrome", () => {
    const holder: RefHolder = { surfaceRef: null };
    render(<Harness holder={holder} className="planeFromBoard" />);

    expect(holder.surfaceRef?.current?.className).toContain("planeFromBoard");
  });

  it("reserves a sentinel that cannot collide with the bank or a grid cell", () => {
    expect(SURFACE_DROPPABLE_ID).not.toBe(BANK_DROPPABLE_ID);
    expect(SURFACE_DROPPABLE_ID).not.toContain(",");
  });
});
