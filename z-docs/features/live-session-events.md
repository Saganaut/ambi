# Live-Session Events

How a live session's state changes reach connected clients: one standardized
envelope, a per-session sequence, and a snapshot re-seed as the recovery path
when that sequence breaks.

## The envelope

Twenty `SessionEvent` record types sit behind a sealed interface
(`session/event/SessionEvent.java`), built only through the `SessionEvents`
static factory. The publish path is a single choke point:

`LiveSessionOrchestrator` → `EventPublisher.publish(publicId, event)` →
`RedisEventPublisher` mints a `SessionEventEnvelope(eventId, sequence,
occurredAt, event)` — allocating the per-session sequence and publishing in one
atomic Lua step — wraps it in `EventEnvelope(publicId, envelope)` → Redis
channel `ambi:session:events` → `LiveSessionStompRelay` forwards **the
envelope, routing `publicId` stripped** to `/topic/liveSession/{publicId}`.

Allocation and publish are one Lua step rather than lock-ordered because
several orchestrator publish sites are deliberately lock-free; out-of-order
allocation would show up as spurious client gap detection. **No call site may
bypass the publisher** — that is what makes every event, present and future,
enveloped identically.

`SessionSnapshotResponse` carries `lastSequence` (0 when the counter key is
absent). Neither the envelope nor the event union is in the OpenAPI schema, so
both are hand-typed in `liveSessionEvents.ts` beside each other.

## Sequencing, dedup, resync

`liveSessionSlice` tracks `lastSequence`, seeded from the snapshot, and applies
an envelope only at `lastSequence + 1`.

- A stale sequence, or an `eventId` already in the 64-entry applied ring, is dropped.
- Anything past the gap is buffered (ascending, capped at 64) behind a `resyncNeeded` flag. Both bounds cover a few seconds of the busiest stream (tallies); past them the re-seed *is* the recovery, not the buffer.
- `SessionConnectionProvider` refetches the snapshot off that flag (debounced 250 ms) and off the socket's `onReconnect` signal — the socket module's own first-connect-vs-resubscribe distinction, since stompjs' `onConnect` fires for both.
- `seed` drops buffered envelopes the fresh snapshot already reflects and replays the rest through the same internal `applyEvent` helper the in-order path uses, clearing the flag only if the buffer drains contiguously.

Connect order is **snapshot-first**: the topic key `publicId` is itself carried
by the snapshot, so subscribe-first would need a second source for it. The gap
check covers the resulting race.

Reducers stay pure — `resyncNeeded` is the whole interface to the refetch,
which the provider owns via the query hook's `refetch`.

**Publishing invariant:** no persisted lifecycle transition without a published
event. `revealResults` and `revealResponses` both carry a slide-match
precondition (409 `ROUND_NOT_CURRENT`) so a stale host call can't move the
*current* round's phase while reading another slide's result; the residual
store-drift case publishes an empty-payload `ResultsRevealed` rather than
returning silently.

## Lifecycle vs ephemeral

`SessionEvent.kind()` statically classifies every type as `LIFECYCLE` (session
and round transitions) or `EPHEMERAL` (high-frequency, superseded state
replacements — `TallyUpdated`, `VoteCast`, `PresenceChanged`, `QAndAUpdated`).
It has **no runtime effect today**. It exists as the filter a future durable
log would persist on: lifecycle events are worth keeping, ephemeral ones are
replaced by the next snapshot anyway. `kind()` has no `default` branch, so a
new event type won't compile until it is classified.

## Open items

- **Presentation-cue layer.** One-shot effects (animations, sounds) should be driven by event *arrival* rather than inferred state changes — RTK listener middleware reacting to `eventReceived` and never to `seed`, so hydrating equivalent state from a snapshot can't replay a cue. That action split already exists; the listeners do not. First intended consumer is a round-completion overlay off `ResultsRevealed`, deduped by `eventId` and respecting `prefers-reduced-motion`. Server-scheduled synchronized cues (`effectiveAt`) are out of scope unless multi-device sync becomes a real requirement.
- **Durable event log.** Deliberately not built (2026-07-27; a client-side Redux journal and a replay product feature were rejected outright, this one only deferred). The seams are in place: the envelope choke point is the tap, `kind()` is the persistence filter, and `sequence` is already the ordering key — a replay endpoint would be `GET /api/liveSessions/{id}/events?afterSequence=N`. Build it when a concrete need lands (post-session analytics, audit, authoritative replay); nothing may preclude it in the meantime.

Related: [diagrams/live-session.md](../diagrams/live-session.md) for the
runtime's overall shape.
