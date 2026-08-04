# 002 — Auto-close round timers for live sessions

**Status:** Accepted — implemented 2026-07-20
**Date:** 2026-07-20

## Context

Live-session rounds are entirely host-driven today: submissions stay open until
the host clicks close/reveal. The 2026-06 live-session design review deferred
timers but flagged one constraint as urgent: `LiveRoundState` is a record
serialized into Redis, so adding pause/duration fields later is a breaking
change to stored state — pause support had to be decided even while the timer
itself was deferred. The 2026-07-20 decision review settled the whole question.

## Decision

Rounds get **full auto-close timers**, not just a display countdown:

- `LiveRoundState` gains `durationMs`, `pausedAt`, and `accumulatedPauseMs` —
  all optional, so an untimed slide keeps today's host-driven behavior. The
  effective deadline is `roundStartedAt + durationMs + accumulatedPauseMs`.
- Deadlines live in a **Redis ZSET** (`score = deadline epochMillis`) polled by
  a **single leader instance** (`DeadlineScheduler`). On expiry the scheduler
  calls the same locked `LiveSessionOrchestrator.closeSubmissions` path a host
  click uses — the timer is just another caller of the existing state machine.
- `pauseTimer`/`resumeTimer` become host operations: pause stamps `pausedAt`
  and removes the ZSET entry; resume folds the pause into
  `accumulatedPauseMs` and re-inserts the recomputed deadline.
- **Host-disconnect policy** rides the same scheduler: on host presence loss the
  open round auto-pauses (flagged `autoPaused` on `LiveRoundState`, to
  distinguish it from a deliberate host pause) and a grace deadline is enqueued;
  if the host doesn't reconnect before it fires, the session is `cancel()`ed.

## Consequences

- Timed slides close deterministically for every participant with no host
  action; clients can render a trustworthy countdown from the broadcast state.
- New infrastructure: leader election (or a singleton poller) for the ZSET
  poll, and scheduler-triggered transitions that must re-validate state under
  the session lock (a host may have closed the round manually first — the
  existing idempotent close makes this safe).
- The `LiveRoundState` record changes once, now, with all three fields —
  avoiding the stored-state migration this ADR exists to prevent.

## Alternatives considered

- **Host-driven only (no timer):** simplest, but weakest gameplay — no
  time-pressure rounds, and the pause-field question would linger unresolved.
- **Soft display-only timer:** clients show a countdown but the host still
  closes manually. Rejected as a half-measure: it needs the same state fields
  while delivering none of the determinism.
- **Per-instance in-JVM schedulers:** no leader needed, but two app instances
  would race to fire the same deadline; the lock would make it safe yet noisy.
  A single ZSET poll is simpler to reason about.
