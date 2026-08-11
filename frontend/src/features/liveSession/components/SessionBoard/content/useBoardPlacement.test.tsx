// Covers the shared continuous-surface placement engine: round reset, drag/tap/keyboard input,
// coordinate orientation, read-only gating, complete-map submission, resubmission, and locking.
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import type { DragEndEvent } from "@dnd-kit/react";

import { BANK_DROPPABLE_ID } from "@utils/dragDrop";
import {
  SessionConnectionContext,
  type SessionConnection,
} from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import { SURFACE_DROPPABLE_ID } from "./PlacementSurface/PlacementSurface";
import { KEYBOARD_NUDGE_STEP, useBoardPlacement, type BoardPlacement } from "./useBoardPlacement";

const RECT = {
  x: 0,
  y: 0,
  left: 0,
  top: 0,
  right: 100,
  bottom: 100,
  width: 100,
  height: 100,
  toJSON: () => ({}),
} as DOMRect;

let rectSpy: ReturnType<typeof vi.spyOn>;
beforeAll(() => {
  rectSpy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(RECT);
});
afterAll(() => {
  rectSpy.mockRestore();
});

const sendAnswer = vi.fn();
// Only `sendAnswer` is exercised; the rest of the command surface is irrelevant
// to placement, so the stub is cast rather than spelled out method by method.
const connection = { sendAnswer } as unknown as SessionConnection;

const wrapper = ({ children }: { children: ReactNode }) => (
  <SessionConnectionContext value={connection}>{children}</SessionConnectionContext>
);

const items = [{ id: "one" }, { id: "two" }];

interface HookProps {
  slideId?: string;
  invertY?: boolean;
  lockOnSubmit?: boolean;
  answerable?: boolean;
}

const renderPlacement = (initialProps: HookProps = {}) =>
  renderHook(
    (props: HookProps) =>
      useBoardPlacement({
        slideId: props.slideId ?? "slide-1",
        items,
        answerable: props.answerable ?? true,
        lockOnSubmit: props.lockOnSubmit ?? false,
        invertY: props.invertY ?? false,
        buildAnswer: (placements) => ({ answerType: "AxisAnswer", placements }),
      }),
    { wrapper, initialProps },
  );

/** Point the hook's surface ref at a detached element with the stubbed rect. */
const attachSurface = (placement: BoardPlacement) => {
  placement.surfaceRef.current = document.createElement("div");
};

/** A dnd-kit drop of `itemId` onto `targetId`, ending at a client position. */
const dropEvent = (itemId: string, targetId: string, clientX = 0, clientY = 0) =>
  ({
    canceled: false,
    operation: {
      source: { id: itemId },
      target: { id: targetId },
      position: { current: { x: clientX, y: clientY } },
    },
  }) as unknown as DragEndEvent;

/** A tap on the surface's full-size place target. */
const tapEvent = (clientX: number, clientY: number) =>
  ({ clientX, clientY }) as unknown as MouseEvent<HTMLElement>;

/** An arrow keypress on a focused placed chip. */
const keyEvent = (key: string) => ({ key, preventDefault: vi.fn() }) as unknown as KeyboardEvent;

describe("useBoardPlacement rounds", () => {
  it("clears the draft, the held chip and the sent flag when the slide changes", () => {
    const { result, rerender } = renderPlacement();
    attachSurface(result.current);

    act(() => {
      result.current.handleDragEnd(dropEvent("one", SURFACE_DROPPABLE_ID, 30, 40));
      result.current.handleDragEnd(dropEvent("two", SURFACE_DROPPABLE_ID, 10, 10));
    });
    act(() => {
      result.current.submit();
      result.current.toggleHold("one");
    });
    expect(result.current.submitted).toBe(true);
    expect(result.current.heldItemId).toBe("one");

    rerender({ slideId: "slide-2" });

    expect(result.current.placements).toEqual({});
    expect(result.current.heldItemId).toBeNull();
    expect(result.current.submitted).toBe(false);
  });
});

describe("useBoardPlacement dragging", () => {
  it("places a dropped chip at the pointer, top-left origin", () => {
    const { result } = renderPlacement({ invertY: false });
    attachSurface(result.current);

    act(() => {
      result.current.handleDragEnd(dropEvent("one", SURFACE_DROPPABLE_ID, 30, 40));
    });

    expect(result.current.placements).toEqual({ one: { x: 0.3, y: 0.4 } });
  });

  it("inverts y for a bottom-left-origin surface", () => {
    const { result } = renderPlacement({ invertY: true });
    attachSurface(result.current);

    act(() => {
      result.current.handleDragEnd(dropEvent("one", SURFACE_DROPPABLE_ID, 30, 40));
    });

    // 40% down the box is 0.6 up from the plane's low corner.
    expect(result.current.placements).toEqual({ one: { x: 0.3, y: 0.6 } });
  });

  it("clamps a drop outside the box into the normalized space", () => {
    const { result } = renderPlacement();
    attachSurface(result.current);

    act(() => {
      result.current.handleDragEnd(dropEvent("one", SURFACE_DROPPABLE_ID, 140, -20));
    });

    expect(result.current.placements).toEqual({ one: { x: 1, y: 0 } });
  });

  it("un-places a chip dragged back to the bank, releasing the hold", () => {
    const { result } = renderPlacement();
    attachSurface(result.current);

    act(() => {
      result.current.handleDragEnd(dropEvent("one", SURFACE_DROPPABLE_ID, 30, 40));
      result.current.handleDragEnd(dropEvent("two", SURFACE_DROPPABLE_ID, 60, 60));
    });
    act(() => {
      result.current.toggleHold("one");
    });
    act(() => {
      result.current.handleDragEnd(dropEvent("one", BANK_DROPPABLE_ID));
    });

    expect(result.current.placements).toEqual({ two: { x: 0.6, y: 0.6 } });
    expect(result.current.heldItemId).toBeNull();
  });

  it("ignores a drop with no item id and one made while frozen", () => {
    const { result, rerender } = renderPlacement();
    attachSurface(result.current);

    act(() => {
      result.current.handleDragEnd(dropEvent("", SURFACE_DROPPABLE_ID, 30, 40));
    });
    expect(result.current.placements).toEqual({});

    rerender({ answerable: false });
    act(() => {
      result.current.handleDragEnd(dropEvent("one", SURFACE_DROPPABLE_ID, 30, 40));
    });
    expect(result.current.placements).toEqual({});
  });

  it("cannot place while the surface is unmeasurable", () => {
    const { result } = renderPlacement();
    // Ref left null: no board surface is mounted.
    act(() => {
      result.current.handleDragEnd(dropEvent("one", SURFACE_DROPPABLE_ID, 30, 40));
    });

    expect(result.current.placements).toEqual({});
  });
});

describe("useBoardPlacement tapping", () => {
  it("holds a bank chip, drops it at the tap, and releases the hold", () => {
    const { result } = renderPlacement();
    attachSurface(result.current);

    act(() => {
      result.current.toggleHold("one");
    });
    expect(result.current.heldItemId).toBe("one");

    act(() => {
      result.current.placeAt(tapEvent(25, 75));
    });

    expect(result.current.placements).toEqual({ one: { x: 0.25, y: 0.75 } });
    expect(result.current.heldItemId).toBeNull();
  });

  it("ignores a tap with nothing held", () => {
    const { result } = renderPlacement();
    attachSurface(result.current);

    act(() => {
      result.current.placeAt(tapEvent(25, 75));
    });

    expect(result.current.placements).toEqual({});
  });

  it("toggles the hold off for the same chip and over to another", () => {
    const { result } = renderPlacement();

    act(() => {
      result.current.toggleHold("one");
    });
    act(() => {
      result.current.toggleHold("one");
    });
    expect(result.current.heldItemId).toBeNull();

    act(() => {
      result.current.toggleHold("one");
    });
    act(() => {
      result.current.toggleHold("two");
    });
    expect(result.current.heldItemId).toBe("two");

    // An id-less item can be tapped but never becomes the held chip.
    act(() => {
      result.current.toggleHold(undefined);
    });
    expect(result.current.heldItemId).toBeNull();
  });

  it("lifts a placed chip back into the hand, un-placing it", () => {
    const { result } = renderPlacement();
    attachSurface(result.current);

    act(() => {
      result.current.handleDragEnd(dropEvent("one", SURFACE_DROPPABLE_ID, 30, 40));
    });
    act(() => {
      result.current.liftItem("one");
    });

    expect(result.current.placements).toEqual({});
    expect(result.current.heldItemId).toBe("one");
  });
});

describe("useBoardPlacement nudging", () => {
  it("steps a placed chip along the surface's own axes", () => {
    const { result } = renderPlacement({ invertY: false });
    attachSurface(result.current);

    act(() => {
      result.current.handleDragEnd(dropEvent("one", SURFACE_DROPPABLE_ID, 50, 50));
    });
    act(() => {
      result.current.nudge("one")(keyEvent("ArrowRight"));
    });
    act(() => {
      // Top-left origin: ArrowUp walks y down towards the top edge.
      result.current.nudge("one")(keyEvent("ArrowUp"));
    });

    expect(result.current.placements.one).toEqual({
      x: 0.5 + KEYBOARD_NUDGE_STEP,
      y: 0.5 - KEYBOARD_NUDGE_STEP,
    });
  });

  it("reverses the vertical deltas for a bottom-left-origin surface", () => {
    const { result } = renderPlacement({ invertY: true });
    attachSurface(result.current);

    act(() => {
      result.current.handleDragEnd(dropEvent("one", SURFACE_DROPPABLE_ID, 50, 50));
    });
    act(() => {
      result.current.nudge("one")(keyEvent("ArrowUp"));
    });
    expect(result.current.placements.one?.y).toBeCloseTo(0.5 + KEYBOARD_NUDGE_STEP);

    act(() => {
      result.current.nudge("one")(keyEvent("ArrowDown"));
      result.current.nudge("one")(keyEvent("ArrowDown"));
    });
    expect(result.current.placements.one?.y).toBeCloseTo(0.5 - KEYBOARD_NUDGE_STEP);
  });

  it("clamps a nudge at the edge and ignores non-arrow keys", () => {
    const { result } = renderPlacement();
    attachSurface(result.current);

    act(() => {
      result.current.handleDragEnd(dropEvent("one", SURFACE_DROPPABLE_ID, 0, 0));
    });
    act(() => {
      result.current.nudge("one")(keyEvent("ArrowLeft"));
      result.current.nudge("one")(keyEvent("ArrowUp"));
    });
    expect(result.current.placements.one).toEqual({ x: 0, y: 0 });

    act(() => {
      result.current.nudge("one")(keyEvent("Enter"));
    });
    expect(result.current.placements.one).toEqual({ x: 0, y: 0 });
  });

  it("does not nudge an unplaced chip or a frozen surface", () => {
    const { result, rerender } = renderPlacement();
    attachSurface(result.current);

    act(() => {
      result.current.nudge("one")(keyEvent("ArrowRight"));
    });
    expect(result.current.placements).toEqual({});

    act(() => {
      result.current.handleDragEnd(dropEvent("one", SURFACE_DROPPABLE_ID, 50, 50));
    });
    rerender({ answerable: false });
    act(() => {
      result.current.nudge("one")(keyEvent("ArrowRight"));
    });
    expect(result.current.placements.one).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe("useBoardPlacement submitting", () => {
  const placeAll = (placement: BoardPlacement) => {
    act(() => {
      placement.handleDragEnd(dropEvent("one", SURFACE_DROPPABLE_ID, 30, 40));
      placement.handleDragEnd(dropEvent("two", SURFACE_DROPPABLE_ID, 70, 25));
    });
  };

  it("stays gated until every item is placed", () => {
    sendAnswer.mockClear();
    const { result } = renderPlacement();
    attachSurface(result.current);

    act(() => {
      result.current.handleDragEnd(dropEvent("one", SURFACE_DROPPABLE_ID, 30, 40));
    });
    expect(result.current.allPlaced).toBe(false);

    act(() => {
      result.current.submit();
    });
    expect(sendAnswer).not.toHaveBeenCalled();
  });

  it("sends the whole map through buildAnswer once complete", () => {
    sendAnswer.mockClear();
    const { result } = renderPlacement();
    attachSurface(result.current);
    placeAll(result.current);

    expect(result.current.allPlaced).toBe(true);
    act(() => {
      result.current.submit();
    });

    expect(sendAnswer).toHaveBeenCalledWith("slide-1", {
      answerType: "AxisAnswer",
      placements: { one: { x: 0.3, y: 0.4 }, two: { x: 0.7, y: 0.25 } },
    });
    expect(result.current.submitted).toBe(true);
  });

  it("keeps a re-sendable board placeable after a submit", () => {
    sendAnswer.mockClear();
    const { result } = renderPlacement({ lockOnSubmit: false });
    attachSurface(result.current);
    placeAll(result.current);

    act(() => {
      result.current.submit();
    });
    expect(result.current.canPlace).toBe(true);

    act(() => {
      result.current.handleDragEnd(dropEvent("one", SURFACE_DROPPABLE_ID, 10, 10));
    });
    act(() => {
      result.current.submit();
    });

    expect(sendAnswer).toHaveBeenCalledTimes(2);
    expect(sendAnswer).toHaveBeenLastCalledWith("slide-1", {
      answerType: "AxisAnswer",
      placements: { one: { x: 0.1, y: 0.1 }, two: { x: 0.7, y: 0.25 } },
    });
  });

  it("freezes a one-shot board on its first submit", () => {
    sendAnswer.mockClear();
    const { result } = renderPlacement({ lockOnSubmit: true });
    attachSurface(result.current);
    placeAll(result.current);

    act(() => {
      result.current.submit();
    });
    expect(result.current.canPlace).toBe(false);

    act(() => {
      result.current.handleDragEnd(dropEvent("one", SURFACE_DROPPABLE_ID, 10, 10));
    });
    act(() => {
      result.current.submit();
    });

    expect(sendAnswer).toHaveBeenCalledTimes(1);
    expect(result.current.placements.one).toEqual({ x: 0.3, y: 0.4 });
  });

  it("is never placeable outside the answerable moments", () => {
    const { result } = renderPlacement({ answerable: false });

    expect(result.current.canPlace).toBe(false);
  });
});
