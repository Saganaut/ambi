// Unit tests for resolveBoardStage — the precedence rules that map session
// state onto a board stage. Uses the shared mock session as a base and overrides
// just the fields under test. Index 0 of the snapshot is a Slide, index 1 an MCQ.
import { describe, it, expect } from "vitest";
import type { InteractiveSessionResponse } from "@store/AmbiApi";
import { mockFellowshipSession } from "@utils/MockData";
import { resolveBoardStage } from "./resolveBoardStage";

// The shared mock pre-reveals some elements; reset to "nothing revealed" so
// each test controls reveal state explicitly.
const base = (
  overrides: Partial<InteractiveSessionResponse> = {},
): InteractiveSessionResponse => ({
  ...mockFellowshipSession,
  revealedElementIds: [],
  ...overrides,
});

const slideId = (s: InteractiveSessionResponse) => s.deckSnapshot[1].id ?? "";

describe("resolveBoardStage", () => {
  it("returns lobby before the game starts", () => {
    expect(resolveBoardStage(base({ status: "LOBBY" }), true)).toEqual({
      type: "lobby",
    });
  });

  it("returns overall results once finished", () => {
    expect(resolveBoardStage(base({ status: "FINISHED" }), true).type).toBe(
      "overall",
    );
  });

  it("returns a slide stage when the current element is a Slide", () => {
    const stage = resolveBoardStage(
      base({ status: "IN_PROGRESS", currentRound: 0 }),
      false,
    );
    expect(stage.type).toBe("slide");
  });

  it("shows the prompt for a GAME question still being answered", () => {
    const stage = resolveBoardStage(
      base({
        status: "IN_PROGRESS",
        currentRound: 1,
        phase: "SUBMIT",
        format: "GAME",
      }),
      false,
    );
    expect(stage).toMatchObject({ type: "question", mode: "prompt" });
  });

  it("makes the prompt interactive for a participant (and the host, while testing)", () => {
    const session = base({
      status: "IN_PROGRESS",
      currentRound: 1,
      phase: "SUBMIT",
      format: "GAME",
    });
    expect(resolveBoardStage(session, false)).toMatchObject({
      interactive: true,
    });
    // HOST_CAN_PARTICIPATE is on while MCQ answering is brought up, so the host
    // can answer on the same board rather than watching read-only.
    expect(resolveBoardStage(session, true)).toMatchObject({
      interactive: true,
    });
  });

  it("streams live results only for PRESENTATION + INSTANT", () => {
    const session = base({
      status: "IN_PROGRESS",
      currentRound: 1,
      phase: "SUBMIT",
      format: "PRESENTATION",
      settings: { ...mockFellowshipSession.settings, showResponses: "INSTANT" },
    });
    expect(resolveBoardStage(session, true)).toMatchObject({
      mode: "liveResults",
    });
  });

  it("keeps PRESENTATION on the prompt when showResponses is not INSTANT", () => {
    const session = base({
      status: "IN_PROGRESS",
      currentRound: 1,
      phase: "SUBMIT",
      format: "PRESENTATION",
      settings: {
        ...mockFellowshipSession.settings,
        showResponses: "ON_CLICK",
      },
    });
    expect(resolveBoardStage(session, true)).toMatchObject({ mode: "prompt" });
  });

  it("shows results in the REVEAL phase, read-only", () => {
    const stage = resolveBoardStage(
      base({ status: "IN_PROGRESS", currentRound: 1, phase: "REVEAL" }),
      false,
    );
    expect(stage).toMatchObject({
      type: "question",
      mode: "results",
      interactive: false,
    });
  });

  it("shows results once the element is in revealedElementIds", () => {
    const session = base({
      status: "IN_PROGRESS",
      currentRound: 1,
      phase: "SUBMIT",
    });
    session.revealedElementIds = [slideId(session)];
    expect(resolveBoardStage(session, false)).toMatchObject({
      mode: "results",
    });
  });

  it("shows results once the round result lands for the current element", () => {
    // A normal GAME round never enters a REVEAL phase — the reveal rides on the
    // /roundResult broadcast, so a matching roundResult flips the board.
    const session = base({
      status: "IN_PROGRESS",
      currentRound: 1,
      phase: "SUBMIT",
    });
    const element = session.deckSnapshot[1];
    const roundResult = {
      round: 1,
      element,
      playerResults: [],
    } as unknown as Parameters<typeof resolveBoardStage>[2];
    expect(resolveBoardStage(session, false, roundResult)).toMatchObject({
      type: "question",
      mode: "results",
      interactive: false,
    });
  });
});
