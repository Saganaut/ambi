// Guards the host-control gating against the backend round state machine: a wrong
// gate here enables a button whose command the backend rejects. Asserts the full
// action set for every round phase (plus display slides and terminal states).
import { describe, it, expect } from "vitest";
import type { LiveSessionLifecycle, RoundPhase } from "../../store/liveSessionEvents";
import { resolveHostActions, type HostActions } from "./resolveHostActions";

const none: HostActions = {
  canShowResponses: false,
  canClose: false,
  canOpenVoting: false,
  canRevealResults: false,
  canAdvance: false,
  canRestart: false,
  canPauseTimer: false,
  canResumeTimer: false,
};

describe("resolveHostActions", () => {
  it("offers nothing outside an in-progress round", () => {
    const statuses: (LiveSessionLifecycle | null)[] = [
      null,
      "LOBBY",
      "FINISHED",
      "CANCELLED",
    ];
    for (const status of statuses) {
      expect(resolveHostActions(status, "SUBMIT", false, true)).toEqual(none);
    }
  });

  it("offers only advance when in progress with no round open yet", () => {
    // beginPlay flips to IN_PROGRESS without opening a round, so the host needs an
    // advance affordance to open the first round; the phase is irrelevant here.
    for (const phase of [null, "SUBMIT"] as (RoundPhase | null)[]) {
      expect(resolveHostActions("IN_PROGRESS", phase, false, false)).toEqual({
        ...none,
        canAdvance: true,
      });
    }
  });

  it("offers only advance for a display slide", () => {
    expect(resolveHostActions("IN_PROGRESS", "SUBMIT", true, true)).toEqual({
      ...none,
      canAdvance: true,
    });
  });

  // Phase → available actions for an in-progress MCQ round. Mirrors the backend:
  // open (SUBMIT/SUBMIT_LIVE) can close & restart; revealing results is offered in
  // every phase but REVEAL_RESULTS (the backend closes + scores an open round on
  // reveal); advance only after results are revealed.
  const cases: [RoundPhase, Partial<HostActions>][] = [
    [
      "SUBMIT",
      { canShowResponses: true, canClose: true, canRevealResults: true, canRestart: true },
    ],
    ["SUBMIT_LIVE", { canClose: true, canRevealResults: true, canRestart: true }],
    ["LOCKED", { canRevealResults: true }],
    ["VOTE", { canRevealResults: true, canRestart: true }],
    ["REVEAL_RESPONSES", { canRevealResults: true }],
    ["REVEAL_RESULTS", { canAdvance: true }],
  ];

  it.each(cases)("gates actions correctly in %s", (phase, expected) => {
    expect(resolveHostActions("IN_PROGRESS", phase, false, true)).toEqual({
      ...none,
      ...expected,
    });
  });

  it("offers reveal-results in every round phase until results are shown", () => {
    // The backend closes + scores an open round when results are revealed, so the
    // gate offers it in the open phases too — only REVEAL_RESULTS (already shown)
    // withholds it.
    for (const phase of [
      "SUBMIT",
      "SUBMIT_LIVE",
      "LOCKED",
      "VOTE",
      "REVEAL_RESPONSES",
    ] as RoundPhase[]) {
      expect(
        resolveHostActions("IN_PROGRESS", phase, false, true).canRevealResults,
      ).toBe(true);
    }
    expect(
      resolveHostActions("IN_PROGRESS", "REVEAL_RESULTS", false, true)
        .canRevealResults,
    ).toBe(false);
  });

  it("never offers restart once the round is closed (already scored)", () => {
    // VOTE is closed but NOT yet scored, so restart stays available there (the
    // host's escape hatch out of voting); the scored closed phases withhold it.
    for (const phase of [
      "LOCKED",
      "REVEAL_RESPONSES",
      "REVEAL_RESULTS",
    ] as RoundPhase[]) {
      expect(
        resolveHostActions("IN_PROGRESS", phase, false, true).canRestart,
      ).toBe(false);
    }
    expect(
      resolveHostActions("IN_PROGRESS", "VOTE", false, true).canRestart,
    ).toBe(true);
  });

  // ── Best-answer voting (D3) ──────────────────────────────────────────────

  it("offers open-voting only on an open round of a votable kind", () => {
    const openVotable = resolveHostActions(
      "IN_PROGRESS", "SUBMIT", false, true, false, false, true);
    expect(openVotable.canOpenVoting).toBe(true);

    // A kind that mints no vote options (e.g. MCQ) never offers it.
    const openUnvotable = resolveHostActions(
      "IN_PROGRESS", "SUBMIT", false, true, false, false, false);
    expect(openUnvotable.canOpenVoting).toBe(false);

    // A normal close scores the round, after which the backend rejects voting.
    for (const phase of [
      "LOCKED",
      "VOTE",
      "REVEAL_RESPONSES",
      "REVEAL_RESULTS",
    ] as RoundPhase[]) {
      expect(
        resolveHostActions("IN_PROGRESS", phase, false, true, false, false, true)
          .canOpenVoting,
      ).toBe(false);
    }
  });

  // ── Parent of a follow-up slide ──────────────────────────────────────────

  // The last positional argument is `hasFollowUp`: the current slide has an
  // attached follow-up, whose round presents this one's results.
  const withFollowUp = (phase: RoundPhase) =>
    resolveHostActions("IN_PROGRESS", phase, false, true, false, false, false, true);

  const everyPhase: RoundPhase[] = [
    "SUBMIT",
    "SUBMIT_LIVE",
    "LOCKED",
    "VOTE",
    "REVEAL_RESPONSES",
    "REVEAL_RESULTS",
  ];

  it("never offers reveal-results on a slide with an attached follow-up", () => {
    // The backend rejects it outright (409 REVEAL_BLOCKED_BY_FOLLOW_UP).
    for (const phase of everyPhase) {
      expect(withFollowUp(phase).canRevealResults).toBe(false);
    }
  });

  it("offers advance on a closed parent round, before any reveal", () => {
    // The parent's flow is close → advance into the child, so the host must be
    // able to move on from the closed-but-unrevealed phases.
    for (const phase of ["LOCKED", "REVEAL_RESPONSES", "REVEAL_RESULTS"] as RoundPhase[]) {
      expect(withFollowUp(phase).canAdvance).toBe(true);
    }
    // Still not while the round is open — close it first.
    for (const phase of ["SUBMIT", "SUBMIT_LIVE"] as RoundPhase[]) {
      expect(withFollowUp(phase).canAdvance).toBe(false);
    }
  });

  it("leaves the parent's other controls alone", () => {
    // Only reveal and advance change; closing, restarting and going live are the
    // ordinary round controls.
    expect(withFollowUp("SUBMIT")).toEqual({
      ...none,
      canShowResponses: true,
      canClose: true,
      canRestart: true,
    });
    expect(withFollowUp("LOCKED")).toEqual({ ...none, canAdvance: true });
  });

  it("keeps the ordinary matrix when no follow-up is attached", () => {
    // Regression guard: the new argument defaults to false and changes nothing.
    for (const phase of everyPhase) {
      expect(resolveHostActions("IN_PROGRESS", phase, false, true, false, false, false, false))
        .toEqual(resolveHostActions("IN_PROGRESS", phase, false, true));
    }
    expect(resolveHostActions("IN_PROGRESS", "LOCKED", false, true).canRevealResults).toBe(true);
    expect(resolveHostActions("IN_PROGRESS", "LOCKED", false, true).canAdvance).toBe(false);
  });

  // The follow-up round itself is never a votable kind, so "open voting" is
  // withheld on it — `isVotableSlide` (asserted in resolveBoardStage.test.ts) is
  // what SessionControls feeds into `votableSlide` here, and an unvotable slide
  // never offers it in any phase (see the open-voting test above).

  // ── Timer control (ADR 002) ──────────────────────────────────────────────

  it("offers pause only on a running timed round, resume only on a paused one", () => {
    const running = resolveHostActions("IN_PROGRESS", "SUBMIT", false, true, true, false);
    expect(running.canPauseTimer).toBe(true);
    expect(running.canResumeTimer).toBe(false);

    const paused = resolveHostActions("IN_PROGRESS", "SUBMIT", false, true, true, true);
    expect(paused.canPauseTimer).toBe(false);
    expect(paused.canResumeTimer).toBe(true);
  });

  it("offers no timer control on an untimed round", () => {
    const actions = resolveHostActions("IN_PROGRESS", "SUBMIT", false, true, false, false);
    expect(actions.canPauseTimer).toBe(false);
    expect(actions.canResumeTimer).toBe(false);
  });

  it("offers no timer control once submissions are closed", () => {
    for (const phase of [
      "LOCKED",
      "REVEAL_RESPONSES",
      "REVEAL_RESULTS",
    ] as RoundPhase[]) {
      const actions = resolveHostActions("IN_PROGRESS", phase, false, true, true, false);
      expect(actions.canPauseTimer).toBe(false);
      expect(actions.canResumeTimer).toBe(false);
    }
  });
});
