import type { UnknownAction } from "@reduxjs/toolkit";
import { describe, expect, it } from "vitest";

import type {
  ParticipantView,
  SessionSnapshotResponse,
  SlideView,
} from "./liveSessionApi.gen";
import type { SessionEvent, SessionEventEnvelope } from "./liveSessionEvents";
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

// Wrap an event the way the broadcast does. The default event id is derived
// from the sequence, so a test only spells one out when it exercises dedup.
const env = (
  sequence: number,
  event: SessionEvent,
  eventId = `evt-${sequence}`,
): SessionEventEnvelope => ({
  eventId,
  sequence,
  occurredAt: "2026-07-01T10:00:00Z",
  event,
});

// The happy path: events delivered as one contiguous run starting at sequence 1
// (the lobby snapshot reports `lastSequence` 0).
const stream = (...events: SessionEvent[]): UnknownAction[] =>
  events.map((event, i) => eventReceived(env(i + 1, event)));

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
    // No events emitted yet for this session.
    expect(state.lastSequence).toBe(0);
    expect(state.resyncNeeded).toBe(false);
  });

  it("seeds the sequence the snapshot reflects", () => {
    const state = play(seed({ ...lobbySnapshot, lastSequence: 12 }));

    expect(state.lastSequence).toBe(12);
  });

  it("drives a full round through the event stream", () => {
    const events: SessionEvent[] = [
      { type: "LiveSessionStarted", status: "IN_PROGRESS", phase: "SUBMIT" },
      { type: "ParticipantJoined", participant: participant("player-3", "Late") },
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
        placeTargets: null,
        allocationTargets: null,
        terminal: true,
      },
    ];

    const state = play(seed(lobbySnapshot), ...stream(...events));

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
    // Every envelope applied, in order.
    expect(state.lastSequence).toBe(events.length);
    expect(state.resyncNeeded).toBe(false);
  });

  it("drives a voting round: options in, count up, cleared on the next round", () => {
    const state = play(
      seed(lobbySnapshot),
      ...stream(
        {
          type: "RoundStarted",
          slideId: "slide-1",
          slide: { id: "slide-1", title: "Q1", contentType: "TEXT" },
          roundStartedAt: "2026-07-01T10:00:00Z",
          deadline: null,
        },
        {
          type: "VotingOpened",
          slideId: "slide-1",
          options: [
            { optionId: "opt-a", text: "the truth" },
            { optionId: "opt-b", text: "a plausible lie" },
          ],
        },
        { type: "VoteCast", slideId: "slide-1", votesCast: 2 },
      ),
      myVoteRecorded("opt-b"),
    );

    expect(state.phase).toBe("VOTE");
    expect(state.voteOptions.map((o) => o.optionId)).toEqual(["opt-a", "opt-b"]);
    expect(state.votesCast).toBe(2);
    expect(state.myVoteOptionId).toBe("opt-b");

    // A fresh round supersedes the voting sub-state entirely.
    const next = liveSessionReducer(
      state,
      eventReceived(
        env(4, {
          type: "RoundStarted",
          slideId: "slide-2",
          slide: { id: "slide-2", title: "Q2", contentType: "TEXT" },
          roundStartedAt: "2026-07-01T10:05:00Z",
          deadline: null,
        }),
      ),
    );
    expect(next.voteOptions).toEqual([]);
    expect(next.myVoteOptionId).toBeNull();
    expect(next.votesCast).toBe(0);
  });

  it("ignores voting events addressed to a slide that is no longer current", () => {
    const state = play(
      seed(lobbySnapshot),
      ...stream(
        {
          type: "RoundStarted",
          slideId: "slide-1",
          slide: { id: "slide-1", title: "Q1", contentType: "TEXT" },
          roundStartedAt: "2026-07-01T10:00:00Z",
          deadline: null,
        },
        {
          type: "VotingOpened",
          slideId: "slide-OLD",
          options: [{ optionId: "stale", text: "stale" }],
        },
        { type: "VoteCast", slideId: "slide-OLD", votesCast: 9 },
      ),
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

  // ── Follow-up rounds ─────────────────────────────────────────────────────

  // Which candidate the viewer authored is per-participant, so it travels on the
  // snapshot only — never on an event.
  const followUpSlide: SlideView = {
    id: "slide-fu",
    title: "Which answer was best?",
    contentType: "FOLLOW_UP",
    followUp: {
      mode: "BEST_ANSWER_VOTE",
      parentSlideId: "slide-1",
      parentTitle: "Q1",
      options: [{ optionId: "opt-a", text: "mine" }],
    },
  };

  const followUpSnapshot: SessionSnapshotResponse = {
    ...lobbySnapshot,
    status: "IN_PROGRESS",
    phase: "SUBMIT",
    currentSlideId: "slide-fu",
    currentSlide: followUpSlide,
    myFollowUpOptionId: "opt-a",
  };

  it("seeds the viewer's own follow-up candidate from the snapshot", () => {
    const state = play(seed(followUpSnapshot));

    expect(state.currentSlide?.followUp?.mode).toBe("BEST_ANSWER_VOTE");
    expect(state.myFollowUpOptionId).toBe("opt-a");
    // Absent from the snapshot (the viewer authored none) reads as null.
    expect(play(seed(lobbySnapshot)).myFollowUpOptionId).toBeNull();
  });

  it("clears the viewer's own follow-up candidate when a round opens or restarts", () => {
    const seeded = play(seed({ ...followUpSnapshot, lastSequence: 4 }));

    const nextRound = liveSessionReducer(
      seeded,
      eventReceived(
        env(5, {
          type: "RoundStarted",
          slideId: "slide-2",
          slide: { id: "slide-2", title: "Q2", contentType: "MCQ" },
          roundStartedAt: "2026-07-01T10:05:00Z",
          deadline: null,
        }),
      ),
    );
    expect(nextRound.myFollowUpOptionId).toBeNull();

    const restarted = liveSessionReducer(
      seeded,
      eventReceived(
        env(5, {
          type: "RoundRestarted",
          slideId: "slide-fu",
          phase: "SUBMIT",
          roundStartedAt: "2026-07-01T10:05:00Z",
          deadline: null,
        }),
      ),
    );
    expect(restarted.myFollowUpOptionId).toBeNull();
  });

  it("re-seeds the viewer's own follow-up candidate from a fresh snapshot", () => {
    // The client that was already connected when the follow-up round opened
    // learns its own candidate only when the provider refetches the snapshot.
    const opened = play(
      seed(lobbySnapshot),
      ...stream({
        type: "RoundStarted",
        slideId: "slide-fu",
        slide: followUpSlide,
        roundStartedAt: "2026-07-01T10:00:00Z",
        deadline: null,
      }),
    );
    expect(opened.myFollowUpOptionId).toBeNull();

    const reseeded = liveSessionReducer(
      opened,
      seed({ ...followUpSnapshot, lastSequence: 1 }),
    );
    expect(reseeded.myFollowUpOptionId).toBe("opt-a");
    expect(reseeded.lastSequence).toBe(1);
  });

  it("ignores a tally addressed to a slide that is no longer current", () => {
    const state = play(
      seed(lobbySnapshot),
      ...stream(
        {
          type: "RoundStarted",
          slideId: "slide-1",
          slide: { id: "slide-1", title: "Q1", contentType: "MCQ" },
          roundStartedAt: "2026-07-01T10:00:00Z",
          deadline: null,
        },
        {
          type: "TallyUpdated",
          slideId: "slide-OLD",
          optionCounts: { stale: 99 },
        },
      ),
    );

    expect(state.optionCounts).toEqual({});
  });

  it("keeps the live tally when the reveal carries no durable counts", () => {
    // Non-MCQ kinds (e.g. grid) aren't durably tallied yet (D5): the reveal's
    // empty counts must not blank the live per-cell tally on the board.
    const state = play(
      seed(lobbySnapshot),
      ...stream(
        {
          type: "RoundStarted",
          slideId: "slide-1",
          slide: { id: "slide-1", title: "Q1", contentType: "GRID" },
          roundStartedAt: "2026-07-01T10:00:00Z",
          deadline: null,
        },
        {
          type: "TallyUpdated",
          slideId: "slide-1",
          optionCounts: { "bat@0,0": 1 },
        },
        {
          type: "ResultsRevealed",
          slideId: "slide-1",
          outcomes: [],
          optionCounts: {},
          correctOption: null,
          scoreboard: [],
          drawings: null,
          placeTargets: null,
          allocationTargets: null,
          terminal: false,
        },
      ),
    );

    expect(state.phase).toBe("REVEAL_RESULTS");
    expect(state.optionCounts).toEqual({ "bat@0,0": 1 });
  });

  it("tracks the round timer through pause and resume", () => {
    const roundStarted: SessionEvent = {
      type: "RoundStarted",
      slideId: "slide-1",
      slide: { id: "slide-1", title: "Q1", contentType: "MCQ" },
      roundStartedAt: "2026-07-01T10:00:00Z",
      deadline: "2026-07-01T10:00:30Z",
    };
    const timerPaused: SessionEvent = {
      type: "TimerPaused",
      slideId: "slide-1",
      pausedAt: "2026-07-01T10:00:10Z",
      deadline: "2026-07-01T10:00:30Z",
    };

    const opened = play(seed(lobbySnapshot), ...stream(roundStarted));
    expect(opened.roundDeadline).toBe("2026-07-01T10:00:30Z");
    expect(opened.timerPausedAt).toBeNull();

    const paused = play(seed(lobbySnapshot), ...stream(roundStarted, timerPaused));
    expect(paused.timerPausedAt).toBe("2026-07-01T10:00:10Z");

    const resumed = play(
      seed(lobbySnapshot),
      ...stream(roundStarted, timerPaused, {
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
      ...stream(
        {
          type: "RoundStarted",
          slideId: "slide-1",
          slide: { id: "slide-1", title: "Q1", contentType: "MCQ" },
          roundStartedAt: "2026-07-01T10:00:00Z",
          deadline: null,
        },
        {
          type: "TimerPaused",
          slideId: "slide-OLD",
          pausedAt: "2026-07-01T10:00:10Z",
          deadline: "2026-07-01T10:00:30Z",
        },
      ),
    );

    expect(state.timerPausedAt).toBeNull();
    expect(state.roundDeadline).toBeNull();
  });

  it("records lifecycle end and cancellation", () => {
    const ended = play(
      seed(lobbySnapshot),
      ...stream({
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
      ...stream({ type: "LiveSessionCancelled", reason: "Host left" }),
    );
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelReason).toBe("Host left");
  });

  it("appends joins to the roster in the order they arrive", () => {
    const state = play(
      seed(lobbySnapshot),
      ...stream(
        { type: "ParticipantJoined", participant: participant("player-4", "Fourth") },
        { type: "ParticipantJoined", participant: participant("player-3", "Third") },
        { type: "ParticipantJoined", participant: participant("player-5", "Fifth") },
      ),
    );

    expect(state.roster).toEqual([
      "host-1",
      "player-2",
      "player-4",
      "player-3",
      "player-5",
    ]);
    expect(state.participants["player-3"]?.displayName).toBe("Third");
  });

  it("keeps the roster free of duplicates when a join is re-delivered", () => {
    const joined: SessionEvent = {
      type: "ParticipantJoined",
      participant: participant("player-3", "Late"),
    };
    // The envelope dedup only catches a repeat of the same emission; a reconnect
    // replay can re-announce the same participant under a fresh id/sequence, so
    // the reducer itself has to stay idempotent.
    const state = play(seed(lobbySnapshot), ...stream(joined, joined));

    expect(state.roster).toEqual(["host-1", "player-2", "player-3"]);
    expect(state.lastSequence).toBe(2);
  });

  it("removes only the departed participant when one leaves", () => {
    const state = play(
      seed(lobbySnapshot),
      ...stream(
        { type: "ParticipantJoined", participant: participant("player-3", "Late") },
        { type: "ParticipantLeft", participantId: "player-2" },
      ),
    );

    expect(state.roster).toEqual(["host-1", "player-3"]);
    expect(state.participants["player-2"]).toBeUndefined();
    expect(state.participants["player-3"]?.displayName).toBe("Late");
  });

  it("takes the roster from the snapshot a host removal carries", () => {
    const state = play(
      seed(lobbySnapshot),
      ...stream({
        type: "ParticipantRemoved",
        participantId: "player-2",
        reason: "KICKED",
        roster: ["host-1"],
      }),
    );

    expect(state.roster).toEqual(["host-1"]);
    expect(state.participants["player-2"]).toBeUndefined();
  });

  it("tracks connection status and resets", () => {
    const connected = play(seed(lobbySnapshot), connectionChanged("connected"));
    expect(connected.connection).toBe("connected");

    const cleared = play(seed(lobbySnapshot), reset());
    expect(cleared.seeded).toBe(false);
    expect(cleared.sessionId).toBeNull();
  });
});

// The envelope contract: only the next sequence applies, redeliveries never do,
// and a gap parks the stream until a fresh snapshot (or the missing envelope)
// makes the run contiguous again.
describe("liveSessionSlice envelope reconciliation", () => {
  const cancelled = (reason: string): SessionEvent => ({
    type: "LiveSessionCancelled",
    reason,
  });

  it("applies an in-order envelope and advances the sequence", () => {
    const state = play(
      seed({ ...lobbySnapshot, lastSequence: 7 }),
      eventReceived(env(8, cancelled("Host left"))),
    );

    expect(state.cancelReason).toBe("Host left");
    expect(state.lastSequence).toBe(8);
    expect(state.resyncNeeded).toBe(false);
  });

  it("discards an envelope the seeded state already reflects", () => {
    const state = play(
      seed({ ...lobbySnapshot, lastSequence: 7 }),
      eventReceived(env(7, cancelled("stale"))),
      eventReceived(env(3, cancelled("staler"))),
    );

    expect(state.cancelReason).toBeNull();
    expect(state.status).toBe("LOBBY");
    expect(state.lastSequence).toBe(7);
    expect(state.resyncNeeded).toBe(false);
  });

  it("discards a redelivered event id even at a fresh sequence", () => {
    const state = play(
      seed(lobbySnapshot),
      eventReceived(env(1, cancelled("Host left"), "evt-dup")),
      // Same emission redelivered under the next sequence: without the applied-id
      // backstop the sequence check alone would let it through.
      eventReceived(env(2, cancelled("applied twice"), "evt-dup")),
    );

    expect(state.cancelReason).toBe("Host left");
    expect(state.lastSequence).toBe(1);
  });

  it("buffers an envelope past a gap and asks for a resync", () => {
    const state = play(
      seed(lobbySnapshot),
      eventReceived(env(3, cancelled("Host left"))),
    );

    // Nothing applied: the events at 1 and 2 are still missing.
    expect(state.cancelReason).toBeNull();
    expect(state.lastSequence).toBe(0);
    expect(state.resyncNeeded).toBe(true);
    expect(state.pendingEvents.map((e) => e.sequence)).toEqual([3]);
  });

  it("replays the buffer when the missing envelopes arrive out of order", () => {
    const state = play(
      seed(lobbySnapshot),
      eventReceived(env(3, cancelled("Host left"))),
      eventReceived(env(2, { type: "SubmissionsLocked", slideId: "slide-1" })),
      eventReceived(env(1, { type: "LiveSessionStarted", status: "IN_PROGRESS", phase: "SUBMIT" })),
    );

    expect(state.status).toBe("CANCELLED");
    expect(state.cancelReason).toBe("Host left");
    expect(state.lastSequence).toBe(3);
    expect(state.pendingEvents).toEqual([]);
    expect(state.resyncNeeded).toBe(false);
  });

  it("re-seeds past the gap, replaying only the still-newer buffered envelopes", () => {
    const gapped = play(
      seed(lobbySnapshot),
      eventReceived(env(2, { type: "SubmissionsLocked", slideId: "slide-1" })),
      eventReceived(env(3, cancelled("Host left"))),
    );
    expect(gapped.resyncNeeded).toBe(true);
    expect(gapped.pendingEvents).toHaveLength(2);

    // The refetched snapshot already reflects sequence 2; only 3 is still new.
    const reseeded = liveSessionReducer(
      gapped,
      seed({ ...lobbySnapshot, status: "IN_PROGRESS", phase: "LOCKED", lastSequence: 2 }),
    );

    expect(reseeded.status).toBe("CANCELLED");
    expect(reseeded.cancelReason).toBe("Host left");
    expect(reseeded.lastSequence).toBe(3);
    expect(reseeded.pendingEvents).toEqual([]);
    expect(reseeded.resyncNeeded).toBe(false);
  });

  it("keeps asking for a resync when the fresh snapshot still leaves a gap", () => {
    const gapped = play(
      seed(lobbySnapshot),
      eventReceived(env(5, cancelled("Host left"))),
    );

    // The snapshot raced ahead of only some of the missing events.
    const reseeded = liveSessionReducer(
      gapped,
      seed({ ...lobbySnapshot, lastSequence: 3 }),
    );

    expect(reseeded.cancelReason).toBeNull();
    expect(reseeded.lastSequence).toBe(3);
    expect(reseeded.pendingEvents.map((e) => e.sequence)).toEqual([5]);
    expect(reseeded.resyncNeeded).toBe(true);
  });

  it("caps the pending buffer, keeping the envelopes nearest the gap", () => {
    const state = play(
      seed(lobbySnapshot),
      // 100 envelopes past the gap; only the first 64 are worth holding.
      ...Array.from({ length: 100 }, (_, i) =>
        eventReceived(env(i + 2, cancelled(`gap-${i}`))),
      ),
    );

    expect(state.pendingEvents).toHaveLength(64);
    expect(state.pendingEvents[0]?.sequence).toBe(2);
    expect(state.pendingEvents.at(-1)?.sequence).toBe(65);
    expect(state.resyncNeeded).toBe(true);
  });

  it("forgets applied event ids beyond the dedup window", () => {
    const applied = play(
      seed(lobbySnapshot),
      ...Array.from({ length: 70 }, (_, i) =>
        eventReceived(
          env(i + 1, { type: "TallyUpdated", slideId: "slide-1", optionCounts: {} }),
        ),
      ),
    );

    expect(applied.lastSequence).toBe(70);
    expect(applied.appliedEventIds).toHaveLength(64);
    expect(applied.appliedEventIds[0]).toBe("evt-7");
  });
});
