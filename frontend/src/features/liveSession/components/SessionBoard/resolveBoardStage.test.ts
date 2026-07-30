// Guards the board stage resolver: the mapping from live status/phase/content
// onto the rendered stage, and the phase → question-mode + interactivity rules.
import { describe, it, expect } from "vitest";
import type { SlideView } from "../../store/liveSessionApi.gen";
import type { RoundPhase } from "../../store/liveSessionEvents";
import type { LiveSessionState } from "../../store/liveSessionSlice";
import { isVotableSlide, resolveBoardStage } from "./resolveBoardStage";

const mcqSlide: SlideView = {
  id: "s1",
  contentType: "MCQ",
  options: [{ id: "a", text: "A" }],
};
const titleSlide: SlideView = { id: "s0", contentType: "TITLE", title: "Hi" };
const followUpSlide: SlideView = {
  id: "s2",
  contentType: "FOLLOW_UP",
  title: "Which answer was best?",
  followUp: {
    mode: "BEST_ANSWER_VOTE",
    parentSlideId: "s1",
    parentTitle: "Q1",
    options: [{ optionId: "opt-a", text: "an answer" }],
  },
};

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

  // ── Follow-up rounds ─────────────────────────────────────────────────────

  it("never treats a follow-up round as a votable kind", () => {
    // A follow-up's options are minted from its parent's submissions and picked
    // through the regular answer path — the VOTE phase stays reserved for voting
    // on the current round's own free-text submissions (D3).
    expect(isVotableSlide(followUpSlide)).toBe(false);
    for (const contentType of ["TEXT", "NUMBER", "DRAWING"] as const) {
      expect(isVotableSlide({ id: "s3", contentType })).toBe(true);
    }
  });

  it("puts a follow-up round on the prompt, interactive while it accepts picks", () => {
    const stage = resolveBoardStage(
      baseState({
        currentSlide: followUpSlide,
        currentSlideId: "s2",
        phase: "SUBMIT",
        viewerIsHost: false,
      }),
    );

    expect(stage.type).toBe("question");
    if (stage.type === "question") {
      expect(stage.mode).toBe("prompt");
      expect(stage.interactive).toBe(true);
    }
  });

  it("shows results for a revealed follow-up round", () => {
    const stage = resolveBoardStage(
      baseState({
        currentSlide: followUpSlide,
        currentSlideId: "s2",
        phase: "REVEAL_RESULTS",
      }),
    );

    expect(stage.type).toBe("question");
    if (stage.type === "question") {
      expect(stage.mode).toBe("results");
      expect(stage.interactive).toBe(false);
    }
  });
});
