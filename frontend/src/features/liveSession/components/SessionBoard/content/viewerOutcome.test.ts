// Guards the viewer-outcome lookup every scored board shares: the slide-scoping
// that keeps a stale reveal off a fresh round, and the misses (no result, no row
// for this viewer, no viewer id) that must all read as "no verdict".
import { describe, it, expect } from "vitest";
import type { ParticipantOutcome } from "../../../store/liveSessionEvents";
import type { RoundResults } from "../../../store/liveSessionSlice";
import { findViewerOutcome } from "./viewerOutcome";

const outcome = (participantId: string, correct: boolean): ParticipantOutcome => ({
  participantId,
  choice: null,
  correct,
  points: 0,
  responseTimeMs: 0,
});

const results = (overrides: Partial<RoundResults> = {}): RoundResults => ({
  slideId: "slide-1",
  outcomes: [outcome("viewer-1", true), outcome("viewer-2", false)],
  optionCounts: {},
  correctOption: null,
  scoreboard: [],
  drawings: null,
  placeTargets: null,
  allocationTargets: null,
  terminal: false,
  ...overrides,
});

describe("findViewerOutcome", () => {
  it("finds the viewer's own row in the round's outcomes", () => {
    expect(findViewerOutcome(results(), "slide-1", "viewer-2")).toEqual(
      outcome("viewer-2", false),
    );
  });

  it("ignores a result carrying another slide's round", () => {
    expect(findViewerOutcome(results(), "slide-2", "viewer-1")).toBeUndefined();
  });

  it("returns nothing when no result has been revealed", () => {
    expect(findViewerOutcome(null, "slide-1", "viewer-1")).toBeUndefined();
    expect(findViewerOutcome(undefined, "slide-1", "viewer-1")).toBeUndefined();
  });

  it("returns nothing for a viewer with no row (they never answered)", () => {
    expect(findViewerOutcome(results(), "slide-1", "viewer-3")).toBeUndefined();
  });

  it("returns nothing before the viewer's participant id is known", () => {
    expect(findViewerOutcome(results(), "slide-1", null)).toBeUndefined();
  });
});
