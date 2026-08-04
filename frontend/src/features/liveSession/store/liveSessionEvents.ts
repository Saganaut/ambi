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
  AllocationTargetView,
  ParticipantView,
  PlaceTargetView,
  QAndAQuestionView,
  ScoreboardEntry,
  SessionSnapshotResponse,
  SlideView,
  VoteOptionView,
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

// ── The 20 event members ────────────────────────────────────────────────────

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
  /** Server-authoritative auto-close instant for a timed round (ADR 002); null when untimed. */
  deadline: string | null;
}

export interface LiveResultsShown {
  type: "LiveResultsShown";
  slideId: string;
  /** null on the mid-round go-live toggle (the client already has the slide). */
  slide: SlideView | null;
  roundStartedAt: string;
  optionCounts: OptionCounts;
  /** Server-authoritative auto-close instant for a timed round (ADR 002); null when untimed. */
  deadline: string | null;
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

/**
 * The round entered VOTE: submissions closed (unscored — scoring waits for the
 * votes) and best-answer voting opened on the carried options (D3). Option ids
 * are opaque server-minted handles — the option→author mapping never reaches
 * the client, so a deception round can't be de-anonymised.
 */
export interface VotingOpened {
  type: "VotingOpened";
  slideId: string;
  options: VoteOptionView[];
}

/**
 * A vote landed (or changed) in the open voting round. Deliberately carries
 * only the running count — per-option tallies would sway voters still deciding.
 */
export interface VoteCast {
  type: "VoteCast";
  slideId: string;
  votesCast: number;
}

/**
 * One participant's submitted drawing, carried by {@link ResultsRevealed} for
 * a Drawing round. Event-only, hand-typed to mirror the backend
 * `DrawingSubmissionView`; `imageUrl` arrives presigned.
 */
export interface DrawingSubmission {
  participantId: string;
  displayName: string | null;
  imageUrl: string | null;
}

export interface ResultsRevealed {
  type: "ResultsRevealed";
  slideId: string;
  outcomes: ParticipantOutcome[];
  optionCounts: OptionCounts;
  /** The answer key, disclosed only now. null for content with no single correct option. */
  correctOption: string | null;
  scoreboard: ScoreboardEntry[];
  /** The submitted-drawings gallery for a Drawing round; null for every other kind. */
  drawings: DrawingSubmission[] | null;
  /**
   * The authored target circles for a Place-on-Image round, disclosed only now;
   * null for every other kind. `PlaceTargetView` is a generated snapshot DTO
   * (it also rides `SessionSnapshotResponse`), so it is imported rather than
   * re-typed here — the same reuse as `SlideView`/`ScoreboardEntry`.
   */
  placeTargets: PlaceTargetView[] | null;
  /**
   * The keyed point splits for an Allocation round, disclosed only now; null
   * for every other kind (an empty array is a collect-only allocation round).
   * `AllocationTargetView` is a generated snapshot DTO (it also rides
   * `SessionSnapshotResponse`), so it is imported rather than re-typed here.
   */
  allocationTargets: AllocationTargetView[] | null;
  /** true on the final round — the cue for the podium. */
  terminal: boolean;
}

export interface RoundRestarted {
  type: "RoundRestarted";
  slideId: string;
  phase: RoundPhase;
  roundStartedAt: string;
  /** The fresh auto-close instant for a timed round (ADR 002); null when untimed. */
  deadline: string | null;
}

/**
 * The open timed round's countdown froze (host action, or auto-pause on host
 * presence loss). Submissions stay open; the remaining time on the clock is
 * `deadline - pausedAt` until a `TimerResumed` arrives.
 */
export interface TimerPaused {
  type: "TimerPaused";
  slideId: string;
  pausedAt: string;
  deadline: string;
}

/** The paused timer is running again; re-seed the countdown from `deadline`. */
export interface TimerResumed {
  type: "TimerResumed";
  slideId: string;
  deadline: string;
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
  | VotingOpened
  | VoteCast
  | ResponsesRevealed
  | ResultsRevealed
  | RoundRestarted
  | TimerPaused
  | TimerResumed
  | LiveSessionEnded
  | LiveSessionCancelled;

/** The `type` discriminator values. */
export type SessionEventType = SessionEvent["type"];

/**
 * The wrapper every broadcast event arrives in (backend
 * `session/event/SessionEventEnvelope.java`). Minted at the single publish
 * choke point, so no event reaches the topic bare.
 *
 * `sequence` is strictly monotonic per session and pairs with the snapshot's
 * `lastSequence`: `sequence === lastSequence + 1` is the "applies cleanly"
 * condition, a lower value is a stale redelivery, and a higher one means events
 * were missed (see `liveSessionSlice`). `eventId` is the dedup key that survives
 * a duplicate delivery of the same sequence.
 *
 * The routing `publicId` is deliberately absent — it stays on the backend's
 * internal envelope.
 */
export interface SessionEventEnvelope {
  /** Unique per emission (a random UUID) — the dedup key. */
  eventId: string;
  /** The session's monotonic event counter, allocated atomically with the publish. */
  sequence: number;
  /** When the envelope was minted (ISO-8601). */
  occurredAt: string;
  event: SessionEvent;
}
