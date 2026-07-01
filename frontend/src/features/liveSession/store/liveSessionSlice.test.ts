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

  it("ignores a tally addressed to a slide that is no longer current", () => {
    const state = play(
      seed(lobbySnapshot),
      eventReceived({
        type: "RoundStarted",
        slideId: "slide-1",
        slide: { id: "slide-1", title: "Q1", contentType: "MCQ" },
        roundStartedAt: "2026-07-01T10:00:00Z",
      }),
      eventReceived({
        type: "TallyUpdated",
        slideId: "slide-OLD",
        optionCounts: { stale: 99 },
      }),
    );

    expect(state.optionCounts).toEqual({});
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
