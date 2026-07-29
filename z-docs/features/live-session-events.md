# Live-Session Event Standardization

Spec for making the live-session event pipeline systematic, extensible, and observable:
a standardized event envelope with sequencing, snapshot/socket reconciliation, and a
presentation-cue layer — while keeping the current lifecycle state machine, orchestrator,
event hierarchy, and board-stage resolver unchanged.

Rejected (2026-07-27): a client-side Redux event journal (Redux DevTools' action log
covers debugging/inspection) and a replay product feature. Deferred, not rejected: a
durable server-side event log — the backend is standardized so it can be added later as
an add-on (see [Deferred: durable event log](#deferred-durable-event-log-add-on)).

---

## Current state (backend §1 landed 2026-07-29; frontend verified 2026-07-27)

**Backend.** Twenty `SessionEvent` record types behind a sealed interface
(`session/event/SessionEvent.java`), built only through the `SessionEvents` static
factory and each statically classified `LIFECYCLE`/`EPHEMERAL` by `SessionEvent.kind()`.
Publish path: `LiveSessionOrchestrator` → `EventPublisher.publish(publicId, event)` →
`RedisEventPublisher` mints a `SessionEventEnvelope(eventId, sequence, occurredAt,
event)` — allocating the per-session sequence and publishing in one atomic Lua step —
wraps it in `EventEnvelope(publicId, envelope)` → Redis channel `ambi:session:events` →
`LiveSessionStompRelay.onMessage` deserializes and forwards **the envelope, routing
`publicId` stripped**, to `/topic/liveSession/{publicId}`. `SessionSnapshotResponse`
carries `lastSequence` (0 when the counter key is absent). Events are still
fire-and-forget: no durable log, no replay endpoint (`LiveSessionController.java:64-65` —
"deltas with no replay").

**Frontend.** Unchanged so far — it still reads the STOMP payload as a bare event.
Redux Toolkit slice (`liveSessionSlice.ts`); every STOMP message is
dispatched once as `eventReceived` and reduced into current state via one switch
(`liveSessionSlice.ts:194-338`), then discarded. No dedup, no gap detection, no sequence
tracking. The REST snapshot (`GET /api/liveSessions/{id}`) carries no sequence/version
field, and the socket opens only after the snapshot resolves
(`SessionConnectionProvider.tsx:137-147`).

**Known defects this spec fixes:**

1. **Silent `REVEAL_RESULTS` transition** — `LiveSessionOrchestrator.revealResults`
   (`LiveSessionOrchestrator.java:1000-1030`) persists the phase change unconditionally
   but returns without publishing any event when no `RoundResult` exists. Connected
   clients never learn the phase changed.
2. **Snapshot→subscribe gap** — events broadcast between the snapshot read and the STOMP
   subscription completing are lost undetectably.
3. **Reconnect loss** — STOMP auto-reconnect (`reconnectDelay: 3000`) resubscribes but
   nothing refetches the snapshot; events missed during a disconnect are lost for the
   rest of the session.

---

## Target architecture

### 1. Event envelope (backend)

Broadcast envelopes to clients rather than bare events:

```java
public record SessionEventEnvelope(
        String eventId,      // UUID, unique per emission
        long sequence,       // per-session, strictly monotonic
        Instant occurredAt,
        SessionEvent event) {
}
```

- **Single choke point**: envelope construction and sequence allocation happen in exactly
  one place on the publish path (inside `EventPublisher`/its impl), so every event —
  present and future — is enveloped identically. No call site may bypass it.
- **Sequence allocation**: per-session monotonic counter (Redis `INCR` on a session-keyed
  counter, TTL'd with the session's other Redis state). Allocation and publish must not
  be observably reordered: audit that every publish site runs under
  `SessionLocks.withLock` (orchestrator sites already do), or allocate-and-publish
  atomically. Spurious client gap detection is the failure mode if two events publish
  out of allocation order.
- **Relay**: `LiveSessionStompRelay` stops stripping — it forwards the client-facing
  envelope (`eventId`, `sequence`, `occurredAt`, `event`) to the STOMP topic. `publicId`
  remains routing-only and is still excluded from the client payload.
- **Snapshot**: `SessionSnapshotResponse` gains `lastSequence` — the sequence of the last
  event emitted at (or before) the state the snapshot reflects. Read it from the same
  counter during snapshot assembly.
- **Event classification**: tag each event type (statically, e.g. a method on the sealed
  interface or an enum in `SessionEvents`) as **lifecycle** (session/round transitions:
  started, round started, locked, revealed, ended…) or **ephemeral** (high-frequency,
  superseded state replacements: `TallyUpdated`, `VoteCast`, `PresenceChanged`,
  `QAndAUpdated`). This has no runtime effect today; it is the seam the future event log
  filters on.

### 2. Every successful transition publishes (backend)

Fix `revealResults`: when no `RoundResult` exists, still publish an event carrying the
phase transition (a `ResultsRevealed` with empty payload, or an explicit variant — decide
in implementation). Invariant going forward: **no persisted lifecycle transition without
a published event.**

### 3. Snapshot/socket reconciliation (frontend)

Close the gap and reconnect defects using the sequence:

- Track `lastSequence` in the slice; `seed` sets it from the snapshot,
  `eventReceived` requires `envelope.sequence === lastSequence + 1` to apply.
- Discard stale (`sequence <= lastSequence`) envelopes; keep a small ring buffer of
  recent `eventId`s as a dedup backstop.
- On a gap (`sequence > lastSequence + 1`) or on STOMP reconnect: refetch the snapshot
  and re-seed. Buffer envelopes that arrive while the refetch is in flight and apply the
  still-newer ones on top of the fresh seed.
- Preferred connect order becomes subscribe-first: open the socket, buffer envelopes,
  fetch the snapshot, drop buffered envelopes with `sequence <= lastSequence`, apply the
  rest. (If snapshot-first is kept, the gap check plus refetch-on-gap still closes the
  race — it just costs an extra snapshot fetch when the race fires.)
- Regenerate frontend API/type artifacts after the backend contract change
  (`npm run generate` — see
  [generated-artifacts](../rules/frontend/generated-artifacts.md)); the hand-maintained
  `liveSessionEvents.ts` union gains the envelope wrapper.

### 4. Presentation-cue layer (frontend)

One-shot effects (animations, sounds) are driven by **event arrival**, not inferred state
changes, via RTK listener middleware (`createListenerMiddleware`) on the store:

- Listeners react only to `eventReceived` — never to `seed` — so hydrating equivalent
  state from a snapshot cannot replay a cue. This guarantee already falls out of the
  existing action split.
- Reducers stay pure; no cue logic in the slice.
- Cue vocabulary (extend as needed):

```ts
type PresentationCue =
  | { type: "slide-entered"; slideId: string }
  | { type: "slide-completed"; slideId: string; terminal: boolean }
  | { type: "results-revealed"; slideId: string }
  | { type: "session-completed" };
```

First consumer — the round-completion animation:

- `ResultsRevealed` → `slide-completed` cue → overlay above `SessionBoard`.
- Respect `prefers-reduced-motion` (no such handling exists in the live-session feature
  today; other frontend features already use it in their CSS).
- Dedup by `eventId` so a duplicate delivery cannot fire it twice.
- Display-only slides complete by navigation away, not results reveal — they take the
  `slide-entered`/navigation path, per `resolveBoardStage`'s existing display/question
  distinction.

If an exit animation must complete before advancing, the host interaction becomes: Next
clicked → local exit animation → animation completes → send advance. Server-scheduled
synchronized cues (`effectiveAt`) are **out of scope** unless multi-device sync becomes a
real requirement.

### Deferred: durable event log (add-on)

Not built now. The standardization above makes it a bolt-on later:

- The envelope choke point is the single tap: an event-log writer subscribes there (or
  the publisher additionally `XADD`s to a per-session Redis Stream, bounded with
  `MAXLEN`, TTL'd with the session).
- The lifecycle/ephemeral classification is the persistence filter: lifecycle events are
  logged; ephemeral tallies/presence are not (they are superseded state replacements).
- `sequence` is already the ordering key; a replay endpoint would be
  `GET /api/liveSessions/{id}/events?afterSequence=N`.

Build it only when a concrete need lands (post-session analytics, audit, authoritative
replay). Nothing in the work below may preclude it.

---

## Work breakdown

Tracked on the [Ambi Dev board](https://trello.com/b/nH50o6jt/ambi-dev); order matters
where noted.

1. **Fix `revealResults` silent transition** — bug fix, independent, ship first (§2).
2. **Presentation-cue layer + completion animation** — frontend-only, no backend
   dependency; dedup hardening lands with item 4 (§4).
3. **Backend event envelope + sequencing + snapshot `lastSequence`** — the contract
   change (§1). **Done** (2026-07-29): allocation and publish are one Lua step rather
   than lock-ordered, because five orchestrator publish sites are deliberately
   lock-free; the lifecycle/ephemeral classification landed with no runtime effect, as
   the seam for item 5. The frontend still consumes the bare `event` field — item 4
   switches it to the envelope.
4. **Frontend envelope handling: dedup, gap detection, reconciliation** — depends on
   item 3 (§3).
5. **Durable event log add-on** — deferred; do not start without a product need
   (§Deferred).
