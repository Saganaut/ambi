# Architecture Decisions

Short Architecture Decision Records (ADRs): "we chose X over Y because Z". One file per decision, named `NNN-short-slug.md`, numbered from the next free `NNN`.

## Index

- [001 — Observability & logging stack](001-observability-stack.md) — hybrid CloudWatch (logs/metrics) + Sentry (errors/RUM, deferred), structured JSON, `X-Request-Id`→`traceId` correlation, LocalStack for local parity.
- [002 — Auto-close round timers for live sessions](002-live-session-round-timers.md) — timed rounds auto-close via a Redis ZSET deadline poll (`DeadlineScheduler`); `LiveRoundState` gains `durationMs`/`pausedAt`/`accumulatedPauseMs`; host-disconnect grace rides the same scheduler.
- [003 — Votes are answers](003-votes-are-answers.md) — voting goes through the answer store; the separate `VoteStore` behind the `VOTE` phase stays shipped but is deprecated in direction.
- [004 — Async image-variant generation](004-async-image-variants.md) — renditions move to a queue and an out-of-process Python worker; readiness is answered at read time from a `pending_image_variants` row whose absence is permanent, not from a persisted variants map.

## Decisions taken

Design calls settled during the live-session build that never earned their own ADR. All are
implemented and verified against the code:

- **No participant reuse.** One `Participant` document per (session, user) — `Participant.join(...)`
  always creates a fresh one; nothing recycles instances across sessions (`resetParticipant()` and
  `ParticipantRepository.findByUserId` were removed). Keeps per-session scores and bans as immutable
  history.
- **`userId` is stripped on the wire, not on the document.** The stored `Participant` keeps
  `userId`; only the DTOs drop it (`SessionSnapshotResponse`). `ParticipantResolver` maps the
  authenticated caller to their roster participant server-side, so identity is never client-supplied.
- **One join code.** `roomCode` is the only code — human-typed *and* URL-embeddable. The separate
  `inviteToken` is commented out rather than deleted in `LiveSession.java` (`:64`, `:111`,
  `:261-263`); `roomCode` and `publicId` are `@Indexed(unique = true)`.
- **Live and durable tallies are deliberately kept separate.** `TallyStore` (Redis, `HINCRBY` at
  submit) serves the pre-reveal bar; `RoundResult.optionCounts()` — rebuilt from the stored
  `List<TallyEntry> optionTally` — is the durable record. Both derive keys from the shared
  `AnswerTallyKeys`, so submit-time and scoring-time agree. The duplication is accepted as final,
  not a defect; revisit only if the two measurably disagree.
- **Bounded Redis loss window = the current open round.** Answers flush to Mongo at round close
  (`scoreAndPersistRound` → `RoundResultProjector`). If Redis is lost mid-round, recovery rebuilds
  `LiveRoundState` from the last Mongo snapshot and the open round restarts; its in-flight
  answers are gone. Continuous answer flushing is explicitly not built.
- **The roster sits outside that window.** Membership is durable on the `Participant` documents
  (`sessionId`, an `admittedAt` that only a landed admit stamps, and a `leftAt` that only an
  explicit leave sets), so the Redis roster SET is a pure cache and never the source of truth.
  `SessionRoster` rehydrates it from
  `findBySessionIdAndLeftAtIsNullAndAdmittedAtNotNullOrderByJoinedAtAsc` when the key is missing, and a `SISMEMBER`
  miss re-checks Mongo and heals the set rather than locking a participant out of their own
  session — so a lost roster costs one slower read, not a rebuild from the last snapshot.

### Legacy `open-decisions` IDs

Source comments across `session/` and `liveSessionSlice.ts` still cite IDs from the retired
`live-session-open-decisions.md` review (all 24 of its items were resolved before it was deleted).
What each one settled:

| ID | Settled as |
|----|------------|
| A1 | STOMP over native WebSocket — no SSE, no polling. See [live-session](../diagrams/live-session.md). |
| A2 | Redis pub/sub relay fans events to every instance (`LiveSessionStompRelay`). |
| B1 | `Round.java` deleted; `LiveRoundState` on the session document is the only round state. |
| B2 | Lifecycle and round phase are separate axes — `LiveSessionLifecycle` vs `RoundPhase`. |
| B3 | The host owns slide navigation; participants follow the broadcast round. |
| C1 | No participant reuse — see above. |
| C2 | `userId` stripped on the wire, not on the document — see above. |
| D5 | Live and durable tallies deliberately separate — see above. |
| F1 | `roomCode` and `publicId` are `@Indexed(unique = true)`. |
| F4 | Host actions are guarded by phase preconditions and the per-session lock; a stale slide 409s `ROUND_NOT_CURRENT`. |

## Template

Use this skeleton for new ADRs:

```markdown
# NNN — Decision title

**Status:** Accepted | Superseded by [link] | Proposed
**Date:** YYYY-MM-DD

## Context
What problem we faced, what constraints applied.

## Decision
What we chose to do.

## Consequences
What this enables, what it costs, what it locks us out of.

## Alternatives considered
Briefly, and why we didn't pick them.
```
