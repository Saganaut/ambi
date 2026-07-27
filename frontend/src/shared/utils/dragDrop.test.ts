// Unit tests for the shared drag-end resolver. Real pointer drags can't
// be simulated in JSDOM, so these construct the minimal event envelope
// `resolveDragEnd` reads (`canceled` + `operation.source/target.id`) and assert
// the framework guards. Same-target no-op semantics live in each surface, not
// here, so they aren't exercised.
import { describe, it, expect } from "vitest";
import type { DragEndEvent } from "@dnd-kit/react";
import { BANK_DROPPABLE_ID, resolveDragEnd } from "./dragDrop";

/** Build the slice of a DragEndEvent that {@link resolveDragEnd} reads. */
const event = (
  source: { id: unknown } | null,
  target: { id: unknown } | null,
  canceled = false,
): DragEndEvent =>
  ({ canceled, operation: { source, target } }) as unknown as DragEndEvent;

describe("resolveDragEnd", () => {
  it("resolves an item dropped on a cell target", () => {
    expect(resolveDragEnd(event({ id: "item-a" }, { id: "1,2" }))).toEqual({
      itemId: "item-a",
      targetId: "1,2",
    });
  });

  it("resolves an item dropped on the bank sentinel", () => {
    expect(resolveDragEnd(event({ id: "item-a" }, { id: BANK_DROPPABLE_ID }))).toEqual({
      itemId: "item-a",
      targetId: BANK_DROPPABLE_ID,
    });
  });

  it("returns null when the drag was canceled", () => {
    expect(resolveDragEnd(event({ id: "item-a" }, { id: "1,2" }, true))).toBeNull();
  });

  it("returns null when there is no drop target (dropped outside any droppable)", () => {
    expect(resolveDragEnd(event({ id: "item-a" }, null))).toBeNull();
  });

  it("returns null when there is no drag source", () => {
    expect(resolveDragEnd(event(null, { id: "1,2" }))).toBeNull();
  });

  it("returns null when the source id is not a string", () => {
    expect(resolveDragEnd(event({ id: 42 }, { id: "1,2" }))).toBeNull();
  });

  it("returns null when the target id is not a string", () => {
    expect(resolveDragEnd(event({ id: "item-a" }, { id: 7 }))).toBeNull();
  });
});
