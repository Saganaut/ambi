# Session Redis layer

Redis infrastructure for **live sessions** — the in-flight game state a round
reads and writes while it's running. Two concerns live here: per-session
**locking** and the **round-state snapshot store**. JSON serialization is delegated to
the cross-cutting [`common/redis/RedisJsonCodec`](../../common/redis/RedisJsonCodec.java).

This mirrors the hand-rolled, dependency-light style of the auth session store
([`RedisTokenSessionService`](../../auth/service/RedisTokenSessionService.java)) —
plain `StringRedisTemplate` ops, namespaced keys, no lock library.

## Pieces

| File | Role |
| --- | --- |
| [`SessionLocks`](SessionLocks.java) | Per-session mutual exclusion (SET-NX + Lua compare-and-delete). |
| [`LiveRoundStateStore`](LiveRoundStateStore.java) | Load / save / clear the `LiveRoundState` snapshot. |
| [`LiveRoundState`](LiveRoundState.java) | The Redis-JSON shape of a round's volatile control state (phase, current slide, start time, and — ADR 002 — `durationMs`/`pausedAt`/`accumulatedPauseMs`/`autoPaused` for the auto-close timer). |
| [`TallyStore`](TallyStore.java) | Per-round option counts as a Redis Hash — lock-free `HINCRBY` per submission. |
| [`AnswerStore`](AnswerStore.java) | Per-round in-flight answers as a Redis Hash (one field per participant; re-submit overwrites), flushed to Mongo at round close. |
| [`VoteStore`](VoteStore.java) / [`VoteOption`](VoteOption.java) | Per-round best-answer voting (D3): a cast-votes Hash (one field per voter; re-vote overwrites) plus the opaque-option-id → `VoteOption` mapping Hash, which keeps each option's author server-side only. Folds into scoring at reveal; never flushed to Mongo. |
| [`PresenceStore`](PresenceStore.java) / [`Presence`](Presence.java) | Per-session live participant presence (connection status + last-seen) as a Redis Hash. |
| [`SessionDeadline`](SessionDeadline.java) | A typed ZSET member (ADR 002) — `close:{sid}:{slideId}`, `hostAway:{sid}`, or `graceCancel:{sid}` — the scheduler-fired transition it represents. |
| [`DeadlineStore`](DeadlineStore.java) | The global deadline ZSET (ADR 002): `schedule`/`cancel` entries, and the atomic Lua `popDue` the leader drains. |
| [`SessionKeys`](SessionKeys.java) | Builds the namespaced keys from a `SessionId`. |
| [`SessionRedisProperties`](SessionRedisProperties.java) | `ambi.session.*` config (namespaces, lock lease, round-state TTL, and the `deadlines.*` block — leader lease, poll interval, host-offline/grace windows). |
| [`RedisJsonCodec`](../../common/redis/RedisJsonCodec.java) | Shared Jackson-3 codec (lives in `common/redis`, reusable). |

## Lock protocol

- **Acquire** — `SET <lockKey> <token> NX PX <lease>`. The value is a fresh
  random token unique to this acquisition. Fail-fast: if the key is already held
  the caller gets a `ConflictException` (HTTP **409**, code `SESSION_LOCKED`), it
  does **not** wait.
- **Release** — a Lua compare-and-delete (`del` only if the stored value still
  equals our token), so a holder whose lease already expired can never delete the
  next owner's lock.
- **Lease TTL** (`ambi.session.lock.lease`, default 10s) is the deadlock
  backstop: a crashed holder's lock self-expires. It must comfortably exceed the
  longest single locked operation.
- **Not reentrant.** A thread already holding a session's lock that calls
  `tryAcquire` again for that session is rejected. Don't nest locked sections for
  the same session.

Use `withLock(sid, work)` for the common case — it acquires, runs, and releases
in a `finally` (including when `work` throws). `LiveSessionOrchestrator` runs
every round transition this way.

## Serialization

`RedisJsonCodec` owns its own **Jackson 3** (`tools.jackson`) `JsonMapper` rather
than injecting Spring's web bean, so its config is independent of the HTTP layer's
(notably, it tolerates unknown properties for forward compatibility, which the web
mapper should not). Jackson 3 auto-registers `java.time` support, so `Instant`
round-trips as ISO-8601 text with no module to register. The
[`AnswerPayload`](../answer/payload/AnswerPayload.java) hierarchy's
`@JsonTypeInfo`/`@JsonSubTypes` come from the shared
`com.fasterxml.jackson.annotation` package, which Jackson 3 resolves natively.
A value it can't write or read throws `RedisCodecException`
— in-flight state is authoritative, so a corrupt record is a real fault, not
silently dropped (unlike the auth store, which treats a corrupt session as "no
session").

## Key namespaces

| Concern | Key | Config |
| --- | --- | --- |
| Lock | `ambi:session:lock:<sessionId>` | `ambi.session.lock.namespace` |
| Round state | `ambi:session:roundstate:<sessionId>` | `ambi.session.round-state.namespace` |
| Tally | `ambi:session:tally:<sessionId>:<slideId>` (Hash) | `ambi.session.tally.namespace` |
| Answers | `ambi:session:answers:<sessionId>:<slideId>` (Hash) | `ambi.session.answers.namespace` |
| Presence | `ambi:session:presence:<sessionId>` (Hash) | `ambi.session.presence.namespace` |
| Deadlines (ADR 002) | `ambi:session:deadlines` (global ZSET, no TTL) | `ambi.session.deadlines.key` |
| Deadline leader (ADR 002) | `ambi:session:deadline-leader` (SET NX PX, 15s lease) | `ambi.session.deadlines.leader-key` |

Inspect live keys with `docker compose exec redis redis-cli -a password KEYS 'ambi:session:*'`.

## Why tallies are a separate key (not a `LiveRoundState` field)

`LiveRoundState` is the host-driven **control** record — start / reveal / resume —
and is read-modify-written under the session lock, where serializing those
transitions is exactly what we want. A tally is bumped once per **participant
submission**: had it stayed a `Map` inside the snapshot, every submission would
have to take the session lock and rewrite the whole blob, so N players hitting
submit at once would all serialize on one lock. Splitting it into a Redis Hash
makes each submission a single atomic `HINCRBY` — no lock, no whole-blob rewrite.
The split is by **write pattern**, not because the snapshot was large.

## Deadline scheduling (ADR 002)

The round-timer auto-close and host-disconnect liveness policy are built on top
of this layer, not inside it: `SessionDeadline` + `DeadlineStore` hold the
global deadline ZSET; `../DeadlineScheduler.java` is the leader-elected poller
that drains it and dispatches into `LiveSessionOrchestrator`. See
[ADR 002](../../../../../../../../../z-docs/decisions/002-live-session-round-timers.md)
and [live-session-flow](../../../../../../../../../z-docs/live-session-flow.md#round-timer-auto-close-adr-002).
