// The live-session event contract: the polymorphic `SessionEvent` stream the
// backend broadcasts over `/topic/liveSession/{publicId}` (see
// backend .../session/event/SessionEvent.java). Unlike the REST DTOs these are
// NOT part of the OpenAPI schema, so the union is typed by hand here — but every
// payload building-block is reused from the generated client rather than
// redefined: the shared DTOs (`ParticipantView`, `SlideView`, `ScoreboardEntry`)
// are imported straight from `liveSessionApi.gen.ts`, and the enums are derived
// from those generated types by indexed access, so a backend enum change flows
// through automatically. Only `ParticipantOutcome` and `RemovalReason` — which
// ride events but never the snapshot — are spelled out locally.
//
// Discriminator: the backend uses `@JsonTypeInfo(property = "type")` with the
// simple class name, so every member carries a `type` literal and consumers
// switch on `event.type`.
import type {
  ParticipantView,
  QAndAQuestionView,
  ScoreboardEntry,
  SessionSnapshotResponse,
  SlideView,
} from "./liveSessionApi.gen";

// Enum aliases reused from the generated schema (the snapshot references the same
// backend enums, so these stay in lock-step with the wire without redefinition).
export type LiveSessionLifecycle = NonNullable<SessionSnapshotResponse["status"]>;
export type RoundPhase = NonNullable<SessionSnapshotResponse["phase"]>;
export type ConnectionStatus = NonNullable<ParticipantView["connectionStatus"]>;

/** Per-option submission counts, keyed by option id. */
export type OptionCounts = Record<string, number>;

/** Why a participant was removed. Event-only (never in the snapshot), so hand-typed. */
export type RemovalReason = "KICKED" | "BANNED";

/**
 * One participant's scored result for a round, carried by {@link ResultsRevealed}.
 * Event-only (the snapshot exposes standings via `scoreboard`, not per-round
 * outcomes), so it is hand-typed to mirror the backend `ParticipantOutcome`.
 */
export interface ParticipantOutcome {
  participantId: string;
  /** The submitted option id / response, or null if the participant did not answer. */
  choice: string | null;
  correct: boolean;
  points: number;
  responseTimeMs: number;
}

// ── The 16 event members ────────────────────────────────────────────────────

export interface LiveSessionStarted {
  type: "LiveSessionStarted";
  status: LiveSessionLifecycle;
  phase: RoundPhase;
}

export interface ParticipantJoined {
  type: "ParticipantJoined";
  participant: ParticipantView;
  /** The full roster (participant ids) after the join. */
  roster: string[];
}

export interface ParticipantLeft {
  type: "ParticipantLeft";
  participantId: string;
  roster: string[];
}

export interface ParticipantReconnected {
  type: "ParticipantReconnected";
  participant: ParticipantView;
}

export interface ParticipantRemoved {
  type: "ParticipantRemoved";
  participantId: string;
  reason: RemovalReason;
  roster: string[];
}

export interface PresenceChanged {
  type: "PresenceChanged";
  participantId: string;
  status: ConnectionStatus;
  lastSeenAt: string;
}

export interface RoundStarted {
  type: "RoundStarted";
  slideId: string;
  slide: SlideView;
  roundStartedAt: string;
}

export interface LiveResultsShown {
  type: "LiveResultsShown";
  slideId: string;
  /** null on the mid-round go-live toggle (the client already has the slide). */
  slide: SlideView | null;
  roundStartedAt: string;
  optionCounts: OptionCounts;
}

export interface TallyUpdated {
  type: "TallyUpdated";
  slideId: string;
  optionCounts: OptionCounts;
}

/**
 * The open Q&A round's question list changed (a question arrived or the host
 * typed/cleared an answer). Carries the full current list — applying it is
 * idempotent, like `TallyUpdated`.
 */
export interface QAndAUpdated {
  type: "QAndAUpdated";
  slideId: string;
  questions: QAndAQuestionView[];
}

export interface SubmissionsLocked {
  type: "SubmissionsLocked";
  slideId: string;
}

export interface ResponsesRevealed {
  type: "ResponsesRevealed";
  slideId: string;
  optionCounts: OptionCounts;
}

export interface ResultsRevealed {
  type: "ResultsRevealed";
  slideId: string;
  outcomes: ParticipantOutcome[];
  optionCounts: OptionCounts;
  /** The answer key, disclosed only now. null for content with no single correct option. */
  correctOption: string | null;
  scoreboard: ScoreboardEntry[];
  /** true on the final round — the cue for the podium. */
  terminal: boolean;
}

export interface RoundRestarted {
  type: "RoundRestarted";
  slideId: string;
  phase: RoundPhase;
  roundStartedAt: string;
}

export interface LiveSessionEnded {
  type: "LiveSessionEnded";
  finalScoreboard: ScoreboardEntry[];
}

export interface LiveSessionCancelled {
  type: "LiveSessionCancelled";
  reason: string | null;
}

/** Anything broadcast to a live session's subscribers over its STOMP topic. */
export type SessionEvent =
  | LiveSessionStarted
  | ParticipantJoined
  | ParticipantLeft
  | ParticipantReconnected
  | ParticipantRemoved
  | PresenceChanged
  | RoundStarted
  | LiveResultsShown
  | TallyUpdated
  | QAndAUpdated
  | SubmissionsLocked
  | ResponsesRevealed
  | ResultsRevealed
  | RoundRestarted
  | LiveSessionEnded
  | LiveSessionCancelled;

/** The `type` discriminator values. */
export type SessionEventType = SessionEvent["type"];
