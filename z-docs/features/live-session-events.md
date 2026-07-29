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

## Current state (backend §1–§2 and frontend §3 landed 2026-07-29)

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

**Frontend.** Reads the STOMP payload as a `SessionEventEnvelope` (hand-typed in
`liveSessionEvents.ts` beside the event union, since neither is in the OpenAPI schema).
`liveSessionSlice` tracks `lastSequence` — seeded from the snapshot — and applies an
envelope only at `lastSequence + 1`; a stale sequence or an `eventId` already in the
64-entry applied ring is dropped, and anything past the gap is buffered (ascending,
capped at 64) behind a `resyncNeeded` flag. `SessionConnectionProvider` refetches the
snapshot off that flag (debounced 250ms) and off the socket's `onReconnect` signal —
the socket module's first-connect-vs-resubscribe distinction, since stompjs' `onConnect`
fires for both. `seed` then drops buffered envelopes the fresh snapshot already reflects
and replays the rest through the same `applyEvent` switch, clearing the flag only if the
buffer drains contiguously. Connect order stays snapshot-first (the topic key `publicId`
is only known from the snapshot); the gap check covers that race. Still no durable log
and no replay endpoint (`LiveSessionController.java:64-65`).

**Known defects this spec fixes:**

1. ~~**Silent `REVEAL_RESULTS` transition**~~ — **Fixed** (2026-07-29).
   `LiveSessionOrchestrator.revealResults` persisted the phase change unconditionally
   but returned without publishing any event when no `RoundResult` existed, so
   connected clients never learned the phase changed. Two fixes: a slide-match
   precondition (409 `ROUND_NOT_CURRENT`) closes the main path into that branch — a
   stale host call naming a non-current slide moving the current round's phase — and
   the remaining store-drift case now publishes an empty-payload `ResultsRevealed`
   instead of returning silently (§2). The same precondition now guards
   `revealResponses` as well (2026-07-29).
2. ~~**Snapshot→subscribe gap**~~ — **Fixed** (2026-07-29). Events broadcast between the
   snapshot read and the STOMP subscription completing are no longer lost undetectably:
   the first envelope past `lastSequence + 1` is buffered, sets `resyncNeeded`, and the
   provider re-seeds from a fresh snapshot (§3).
3. ~~**Reconnect loss**~~ — **Fixed** (2026-07-29). STOMP auto-reconnect
   (`reconnectDelay: 3000`) now reports the resubscribe to the provider (`onReconnect`),
   which refetches the snapshot, so the disconnect window closes with a re-seed (§3).

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

**Done** (2026-07-29). `revealResults` gained two things:

- A **slide-match precondition**, checked before any state mutation: `slideId` must be
  the round state's `currentSlideId`, else `ConflictException("ROUND_NOT_CURRENT")` →
  409 (the same precondition `submitAnswer` already applied). This was the main
  reachable path into the no-result branch — a stale or racing host call would drive
  the *current* round to `REVEAL_RESULTS` while looking up the *other* slide's result.
- An **empty-payload publish** for what remains: a closed round with no persisted
  `RoundResult` (Redis round state drifted from the results store). It publishes
  `ResultsRevealed` via `SessionEvents.resultsRevealedWithoutRecord` — empty
  `outcomes`/`optionCounts`, null `correctOption`/`drawings`/`placeTargets`, real
  `scoreboard` and `terminal`. **No new event variant**: the reducer already handles
  the empty payload, so a variant would have cost a frontend contract change for no
  gain. Only an unpublishable round (`publicId == null`, no routing id) still bails.

`revealResponses` carries the same slide-match precondition (2026-07-29): it tallied the
*passed* slide but flipped the *current* round's phase, so a stale host call could publish
one slide's distribution as another round's transition. The check runs ahead of the
idempotence short-circuit — a stale call on an already-showing round 409s rather than
passing silently — and it also rejects a reveal before any round has opened (an idle
session has no `currentSlideId`).

Invariant going forward: **no persisted lifecycle transition without a published
event.**

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
  race — it just costs an extra snapshot fetch when the race fires.) **Kept
  snapshot-first** (2026-07-29): the topic key `publicId` is itself carried by the
  snapshot, so subscribe-first would need a second source for it; the buffer/replay path
  is the same either way.
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

1. **Fix `revealResults` silent transition** — bug fix, independent (§2). **Done**
   (2026-07-29): slide-match precondition (409 `ROUND_NOT_CURRENT`) plus an
   empty-payload `ResultsRevealed` for the store-drift case; no frontend change. The
   precondition was extended to `revealResponses` (2026-07-29).
2. **Presentation-cue layer + completion animation** — frontend-only, no backend
   dependency; dedup hardening lands with item 4 (§4).
3. **Backend event envelope + sequencing + snapshot `lastSequence`** — the contract
   change (§1). **Done** (2026-07-29): allocation and publish are one Lua step rather
   than lock-ordered, because five orchestrator publish sites are deliberately
   lock-free; the lifecycle/ephemeral classification landed with no runtime effect, as
   the seam for item 5. The frontend still consumes the bare `event` field — item 4
   switches it to the envelope.
4. **Frontend envelope handling: dedup, gap detection, reconciliation** — depends on
   item 3 (§3). **Done** (2026-07-29): sequence gating plus a 64-entry applied-`eventId`
   ring and a 64-envelope pending buffer in the slice, both bounds chosen to cover a few
   seconds of the busiest stream (tallies) — past them the snapshot re-seed is the
   recovery, not the buffer. The reducer's event switch became the internal `applyEvent`
   helper so an in-order arrival and a post-re-seed replay take the identical path.
   Reducers stayed pure: `resyncNeeded` is the whole interface to the refetch, which the
   provider owns via the query hook's own `refetch`.
5. **Durable event log add-on** — deferred; do not start without a product need
   (§Deferred).
