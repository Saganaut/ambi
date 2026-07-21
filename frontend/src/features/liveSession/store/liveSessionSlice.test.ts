import type { UnknownAction } from "@reduxjs/toolkit";
import { describe, expect, it } from "vitest";

import type {
  ParticipantView,
  SessionSnapshotResponse,
} from "./liveSessionApi.gen";
import type { SessionEvent } from "./liveSessionEvents";
import {
  connectionChanged,
  eventReceived,
  liveSessionReducer,
  myVoteRecorded,
  reset,
  seed,
  type LiveSessionState,
} from "./liveSessionSlice";

const participant = (id: string, name: string): ParticipantView => ({
  participantId: id,
  displayName: name,
  connectionStatus: "ONLINE",
  score: { points: 0 },
});

const lobbySnapshot: SessionSnapshotResponse = {
  sessionId: "sess-1",
  publicId: "pub-1",
  roomCode: "ROOMCODE",
  status: "LOBBY",
  phase: "SUBMIT",
  roster: [participant("host-1", "Hosty"), participant("player-2", "Player")],
  scoreboard: [],
  viewerParticipantId: "host-1",
  viewerIsHost: true,
};

// Fold a list of actions over the reducer starting from its initial state.
const play = (...actions: UnknownAction[]): LiveSessionState =>
  actions.reduce<LiveSessionState>(
    (s, a) => liveSessionReducer(s, a),
    liveSessionReducer(undefined, { type: "@@INIT" }),
  );

describe("liveSessionSlice", () => {
  it("seeds the read model from a snapshot", () => {
    const state = play(seed(lobbySnapshot));

    expect(state.seeded).toBe(true);
    expect(state.sessionId).toBe("sess-1");
    expect(state.publicId).toBe("pub-1");
    expect(state.roomCode).toBe("ROOMCODE");
    expect(state.status).toBe("LOBBY");
    // Roster order preserved, and each participant indexed by id.
    expect(state.roster).toEqual(["host-1", "player-2"]);
    expect(state.participants["player-2"]?.displayName).toBe("Player");
    expect(state.viewerParticipantId).toBe("host-1");
    expect(state.viewerIsHost).toBe(true);
  });

  it("drives a full round through the event stream", () => {
    const events: SessionEvent[] = [
      { type: "LiveSessionStarted", status: "IN_PROGRESS", phase: "SUBMIT" },
      {
        type: "ParticipantJoined",
        participant: participant("player-3", "Late"),
        roster: ["host-1", "player-2", "player-3"],
      },
      {
        type: "RoundStarted",
        slideId: "slide-1",
        slide: { id: "slide-1", title: "Q1", contentType: "MCQ" },
        roundStartedAt: "2026-07-01T10:00:00Z",
        deadline: null,
      },
      { type: "TallyUpdated", slideId: "slide-1", optionCounts: { "opt-a": 2 } },
      { type: "SubmissionsLocked", slideId: "slide-1" },
      {
        type: "ResponsesRevealed",
        slideId: "slide-1",
        optionCounts: { "opt-a": 2, "opt-b": 1 },
      },
      {
        type: "ResultsRevealed",
        slideId: "slide-1",
        outcomes: [],
        optionCounts: { "opt-a": 2, "opt-b": 1 },
        correctOption: "opt-a",
        scoreboard: [
          { participantId: "host-1", displayName: "Hosty", points: 10, rank: 1 },
        ],
        drawings: null,
        terminal: true,
      },
    ];

    const state = play(
      seed(lobbySnapshot),
      ...events.map((e) => eventReceived(e)),
    );

    expect(state.status).toBe("IN_PROGRESS");
    expect(state.roster).toEqual(["host-1", "player-2", "player-3"]);
    expect(state.currentSlideId).toBe("slide-1");
    expect(state.currentSlide?.title).toBe("Q1");
    expect(state.roundStartedAt).toBe("2026-07-01T10:00:00Z");
    // Phase reflects the last transition (results revealed).
    expect(state.phase).toBe("REVEAL_RESULTS");
    expect(state.optionCounts).toEqual({ "opt-a": 2, "opt-b": 1 });
    expect(state.results?.correctOption).toBe("opt-a");
    expect(state.results?.terminal).toBe(true);
    expect(state.scoreboard).toHaveLength(1);
  });

  it("drives a voting round: options in, count up, cleared on the next round", () => {
    const openRound = eventReceived({
      type: "RoundStarted",
      slideId: "slide-1",
      slide: { id: "slide-1", title: "Q1", contentType: "TEXT" },
      roundStartedAt: "2026-07-01T10:00:00Z",
      deadline: null,
    });
    const state = play(
      seed(lobbySnapshot),
      openRound,
      eventReceived({
        type: "VotingOpened",
        slideId: "slide-1",
        options: [
          { optionId: "opt-a", text: "the truth" },
          { optionId: "opt-b", text: "a plausible lie" },
        ],
      }),
      eventReceived({ type: "VoteCast", slideId: "slide-1", votesCast: 2 }),
      myVoteRecorded("opt-b"),
    );

    expect(state.phase).toBe("VOTE");
    expect(state.voteOptions.map((o) => o.optionId)).toEqual(["opt-a", "opt-b"]);
    expect(state.votesCast).toBe(2);
    expect(state.myVoteOptionId).toBe("opt-b");

    // A fresh round supersedes the voting sub-state entirely.
    const next = liveSessionReducer(
      state,
      eventReceived({
        type: "RoundStarted",
        slideId: "slide-2",
        slide: { id: "slide-2", title: "Q2", contentType: "TEXT" },
        roundStartedAt: "2026-07-01T10:05:00Z",
        deadline: null,
      }),
    );
    expect(next.voteOptions).toEqual([]);
    expect(next.myVoteOptionId).toBeNull();
    expect(next.votesCast).toBe(0);
  });

  it("ignores voting events addressed to a slide that is no longer current", () => {
    const state = play(
      seed(lobbySnapshot),
      eventReceived({
        type: "RoundStarted",
        slideId: "slide-1",
        slide: { id: "slide-1", title: "Q1", contentType: "TEXT" },
        roundStartedAt: "2026-07-01T10:00:00Z",
        deadline: null,
      }),
      eventReceived({
        type: "VotingOpened",
        slideId: "slide-OLD",
        options: [{ optionId: "stale", text: "stale" }],
      }),
      eventReceived({ type: "VoteCast", slideId: "slide-OLD", votesCast: 9 }),
    );

    expect(state.phase).toBe("SUBMIT");
    expect(state.voteOptions).toEqual([]);
    expect(state.votesCast).toBe(0);
  });

  it("seeds the voting sub-state from a mid-vote snapshot", () => {
    const state = play(
      seed({
        ...lobbySnapshot,
        status: "IN_PROGRESS",
        phase: "VOTE",
        currentSlideId: "slide-1",
        voteOptions: [{ optionId: "opt-a", text: "the truth" }],
        myVoteOptionId: "opt-a",
        votesCast: 3,
      }),
    );

    expect(state.phase).toBe("VOTE");
    expect(state.voteOptions).toHaveLength(1);
    expect(state.myVoteOptionId).toBe("opt-a");
    expect(state.votesCast).toBe(3);
  });

  it("ignores a tally addressed to a slide that is no longer current", () => {
    const state = play(
      seed(lobbySnapshot),
      eventReceived({
        type: "RoundStarted",
        slideId: "slide-1",
        slide: { id: "slide-1", title: "Q1", contentType: "MCQ" },
        roundStartedAt: "2026-07-01T10:00:00Z",
        deadline: null,
      }),
      eventReceived({
        type: "TallyUpdated",
        slideId: "slide-OLD",
        optionCounts: { stale: 99 },
      }),
    );

    expect(state.optionCounts).toEqual({});
  });

  it("keeps the live tally when the reveal carries no durable counts", () => {
    // Non-MCQ kinds (e.g. grid) aren't durably tallied yet (D5): the reveal's
    // empty counts must not blank the live per-cell tally on the board.
    const state = play(
      seed(lobbySnapshot),
      eventReceived({
        type: "RoundStarted",
        slideId: "slide-1",
        slide: { id: "slide-1", title: "Q1", contentType: "GRID" },
        roundStartedAt: "2026-07-01T10:00:00Z",
        deadline: null,
      }),
      eventReceived({
        type: "TallyUpdated",
        slideId: "slide-1",
        optionCounts: { "bat@0,0": 1 },
      }),
      eventReceived({
        type: "ResultsRevealed",
        slideId: "slide-1",
        outcomes: [],
        optionCounts: {},
        correctOption: null,
        scoreboard: [],
        drawings: null,
        terminal: false,
      }),
    );

    expect(state.phase).toBe("REVEAL_RESULTS");
    expect(state.optionCounts).toEqual({ "bat@0,0": 1 });
  });

  it("tracks the round timer through pause and resume", () => {
    const opened = play(
      seed(lobbySnapshot),
      eventReceived({
        type: "RoundStarted",
        slideId: "slide-1",
        slide: { id: "slide-1", title: "Q1", contentType: "MCQ" },
        roundStartedAt: "2026-07-01T10:00:00Z",
        deadline: "2026-07-01T10:00:30Z",
      }),
    );
    expect(opened.roundDeadline).toBe("2026-07-01T10:00:30Z");
    expect(opened.timerPausedAt).toBeNull();

    const paused = play(
      seed(lobbySnapshot),
      eventReceived({
        type: "RoundStarted",
        slideId: "slide-1",
        slide: { id: "slide-1", title: "Q1", contentType: "MCQ" },
        roundStartedAt: "2026-07-01T10:00:00Z",
        deadline: "2026-07-01T10:00:30Z",
      }),
      eventReceived({
        type: "TimerPaused",
        slideId: "slide-1",
        pausedAt: "2026-07-01T10:00:10Z",
        deadline: "2026-07-01T10:00:30Z",
      }),
    );
    expect(paused.timerPausedAt).toBe("2026-07-01T10:00:10Z");

    const resumed = play(
      seed(lobbySnapshot),
      eventReceived({
        type: "RoundStarted",
        slideId: "slide-1",
        slide: { id: "slide-1", title: "Q1", contentType: "MCQ" },
        roundStartedAt: "2026-07-01T10:00:00Z",
        deadline: "2026-07-01T10:00:30Z",
      }),
      eventReceived({
        type: "TimerPaused",
        slideId: "slide-1",
        pausedAt: "2026-07-01T10:00:10Z",
        deadline: "2026-07-01T10:00:30Z",
      }),
      eventReceived({
        type: "TimerResumed",
        slideId: "slide-1",
        deadline: "2026-07-01T10:00:45Z",
      }),
    );
    expect(resumed.timerPausedAt).toBeNull();
    // The resumed deadline carries the folded-in pause.
    expect(resumed.roundDeadline).toBe("2026-07-01T10:00:45Z");
  });

  it("ignores a timer event addressed to a slide that is no longer current", () => {
    const state = play(
      seed(lobbySnapshot),
      eventReceived({
        type: "RoundStarted",
        slideId: "slide-1",
        slide: { id: "slide-1", title: "Q1", contentType: "MCQ" },
        roundStartedAt: "2026-07-01T10:00:00Z",
        deadline: null,
      }),
      eventReceived({
        type: "TimerPaused",
        slideId: "slide-OLD",
        pausedAt: "2026-07-01T10:00:10Z",
        deadline: "2026-07-01T10:00:30Z",
      }),
    );

    expect(state.timerPausedAt).toBeNull();
    expect(state.roundDeadline).toBeNull();
  });

  it("records lifecycle end and cancellation", () => {
    const ended = play(
      seed(lobbySnapshot),
      eventReceived({
        type: "LiveSessionEnded",
        finalScoreboard: [
          { participantId: "host-1", displayName: "Hosty", points: 30, rank: 1 },
        ],
      }),
    );
    expect(ended.status).toBe("FINISHED");
    expect(ended.finalScoreboard).toHaveLength(1);

    const cancelled = play(
      seed(lobbySnapshot),
      eventReceived({ type: "LiveSessionCancelled", reason: "Host left" }),
    );
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelReason).toBe("Host left");
  });

  it("tracks connection status and resets", () => {
    const connected = play(seed(lobbySnapshot), connectionChanged("connected"));
    expect(connected.connection).toBe("connected");

    const cleared = play(seed(lobbySnapshot), reset());
    expect(cleared.seeded).toBe(false);
    expect(cleared.sessionId).toBeNull();
  });
});
