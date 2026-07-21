// Guards the board stage resolver: the mapping from live status/phase/content
// onto the rendered stage, and the phase → question-mode + interactivity rules.
import { describe, it, expect } from "vitest";
import type { SlideView } from "../../store/liveSessionApi.gen";
import type { RoundPhase } from "../../store/liveSessionEvents";
import type { LiveSessionState } from "../../store/liveSessionSlice";
import { resolveBoardStage } from "./resolveBoardStage";

const mcqSlide: SlideView = {
  id: "s1",
  contentType: "MCQ",
  options: [{ id: "a", text: "A" }],
};
const titleSlide: SlideView = { id: "s0", contentType: "TITLE", title: "Hi" };

const baseState = (over: Partial<LiveSessionState>): LiveSessionState =>
  ({
    seeded: true,
    sessionId: "sess",
    publicId: "ROOM",
    status: "IN_PROGRESS",
    phase: "SUBMIT",
    participants: {},
    roster: [],
    currentSlideId: "s1",
    currentSlide: mcqSlide,
    roundStartedAt: null,
    optionCounts: {},
    results: null,
    scoreboard: [],
    finalScoreboard: null,
    cancelReason: null,
    viewerParticipantId: null,
    viewerIsHost: false,
    connection: "connected",
    ...over,
  }) as LiveSessionState;

describe("resolveBoardStage", () => {
  it("is lobby before the game and when unseeded", () => {
    expect(resolveBoardStage(baseState({ status: "LOBBY" })).type).toBe("lobby");
    expect(resolveBoardStage(baseState({ status: null })).type).toBe("lobby");
  });

  it("is overall on terminal states", () => {
    expect(resolveBoardStage(baseState({ status: "FINISHED" })).type).toBe(
      "overall",
    );
    expect(resolveBoardStage(baseState({ status: "CANCELLED" })).type).toBe(
      "overall",
    );
  });

  it("falls back to lobby when in progress with no current slide", () => {
    expect(
      resolveBoardStage(baseState({ currentSlide: null })).type,
    ).toBe("lobby");
  });

  it("renders a display slide as the slide stage", () => {
    const stage = resolveBoardStage(
      baseState({ currentSlide: titleSlide, currentSlideId: "s0" }),
    );
    expect(stage.type).toBe("slide");
  });

  // Phase → question mode. Only REVEAL_RESULTS shows the answer key; the live
  // distribution shows in SUBMIT_LIVE / REVEAL_RESPONSES; otherwise the prompt.
  const modeCases: [RoundPhase, string][] = [
    ["SUBMIT", "prompt"],
    ["LOCKED", "prompt"],
    ["SUBMIT_LIVE", "liveResults"],
    ["VOTE", "vote"],
    ["REVEAL_RESPONSES", "liveResults"],
    ["REVEAL_RESULTS", "results"],
  ];

  it.each(modeCases)("maps phase %s to question mode %s", (phase, mode) => {
    const stage = resolveBoardStage(baseState({ phase }));
    expect(stage.type).toBe("question");
    if (stage.type === "question") expect(stage.mode).toBe(mode);
  });

  it("is interactive only while the round accepts answers or votes", () => {
    // Participant, input-accepting phases (answering, or voting) → interactive.
    for (const phase of ["SUBMIT", "SUBMIT_LIVE", "VOTE"] as RoundPhase[]) {
      const stage = resolveBoardStage(baseState({ phase, viewerIsHost: false }));
      if (stage.type === "question") expect(stage.interactive).toBe(true);
    }
    // Closed non-voting phases → never interactive.
    for (const phase of [
      "LOCKED",
      "REVEAL_RESPONSES",
      "REVEAL_RESULTS",
    ] as RoundPhase[]) {
      const stage = resolveBoardStage(baseState({ phase, viewerIsHost: false }));
      if (stage.type === "question") expect(stage.interactive).toBe(false);
    }
  });
});
