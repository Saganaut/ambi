// Reducer tests for the chunk-25 host-control state on the interactive-session
// slice: timer pause/resume mirroring and the one-shot end-submit signal.
import { describe, it, expect } from "vitest";
import reducer, {
  roundStarted,
  setSession,
  timerStateReceived,
  submissionsClosingReceived,
  submissionsClosingConsumed,
} from "./interactiveSessionSlice";
import { mockFellowshipSession } from "@/utils/MockData";

// Fresh initial state.
const base = () => reducer(undefined, { type: "@@INIT" });
// State synced from the mock session, whose currentRound is 2.
const atRound2 = () => reducer(base(), setSession(mockFellowshipSession));

describe("interactiveSessionSlice — host controls (chunk 25)", () => {
  it("setSession latches timerPaused + timerRemainingMillis from the DTO", () => {
    const s = reducer(
      base(),
      setSession({
        ...mockFellowshipSession,
        timerPaused: true,
        timerRemainingMillis: 7000,
      }),
    );
    expect(s.timerPaused).toBe(true);
    expect(s.timerRemainingMillis).toBe(7000);
  });

  it("timerStateReceived applies paused + remaining + roundStartedAt for the current round", () => {
    const s = reducer(
      atRound2(),
      timerStateReceived({
        round: 2,
        paused: true,
        remainingMillis: 5000,
        roundStartedAt: "2026-01-01T00:00:00Z",
      }),
    );
    expect(s.timerPaused).toBe(true);
    expect(s.timerRemainingMillis).toBe(5000);
    expect(s.roundStartedAt).toBe("2026-01-01T00:00:00Z");
  });

  it("timerStateReceived ignores a stale round", () => {
    const s = reducer(
      atRound2(),
      timerStateReceived({
        round: 99,
        paused: true,
        remainingMillis: 5000,
        roundStartedAt: "x",
      }),
    );
    expect(s.timerPaused).toBe(false);
  });

  it("submissionsClosingReceived raises a one-shot signal for the current round", () => {
    const s = reducer(
      atRound2(),
      submissionsClosingReceived({ round: 2, elementId: "el-1", graceMillis: 1500 }),
    );
    expect(s.submissionsClosing?.elementId).toBe("el-1");
    expect(s.submissionsClosing?.graceMillis).toBe(1500);
    expect(typeof s.submissionsClosing?.nonce).toBe("number");
  });

  it("submissionsClosingReceived ignores a stale round", () => {
    const s = reducer(
      atRound2(),
      submissionsClosingReceived({ round: 99, elementId: "el-1", graceMillis: 1500 }),
    );
    expect(s.submissionsClosing).toBeNull();
  });

  it("submissionsClosingConsumed clears the signal", () => {
    const withSignal = reducer(
      atRound2(),
      submissionsClosingReceived({ round: 2, elementId: "el-1", graceMillis: 1500 }),
    );
    const s = reducer(withSignal, submissionsClosingConsumed());
    expect(s.submissionsClosing).toBeNull();
  });

  it("roundStarted clears pause + closing state from the previous round", () => {
    let s = atRound2();
    s = reducer(
      s,
      timerStateReceived({
        round: 2,
        paused: true,
        remainingMillis: 5000,
        roundStartedAt: "x",
      }),
    );
    s = reducer(
      s,
      submissionsClosingReceived({ round: 2, elementId: "el-1", graceMillis: 1500 }),
    );
    s = reducer(
      s,
      roundStarted({
        round: 3,
        totalRounds: 5,
        element: mockFellowshipSession.deckSnapshot[0],
        startedAt: "y",
      }),
    );
    expect(s.timerPaused).toBe(false);
    expect(s.timerRemainingMillis).toBeNull();
    expect(s.submissionsClosing).toBeNull();
  });
});
