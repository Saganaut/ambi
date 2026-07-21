# Live Session Backend Flow

Flow of a live session through the backend, focused on the Redis stores, the
event/notification path, and WebSocket delivery.

The orchestrator never touches transport — it reads/writes Redis (volatile live
state) and Mongo (durable aggregate), then publishes a `SessionEvent` through
`EventPublisher`. Events fan out over a single Redis pub/sub channel; each
instance's relay re-emits them to the local STOMP broker.

## Architecture flow

```mermaid
flowchart TB
    subgraph clients["Clients (Host + Participants)"]
        REST["REST commands<br/>(start · join · openRound<br/>· submit · reveal · end)"]
        WS["WebSocket subscribers<br/>SUB /topic/liveSession/{publicId}"]
    end

    subgraph app["Backend instance(s)"]
        ORCH["LiveSessionOrchestrator<br/>every transition:<br/>1. withLock → 2. R/W Redis<br/>3. R/W Mongo → 4. publish event"]
        SCHED["DeadlineScheduler<br/>runs on every instance;<br/>only the leader (Redis lease) drains deadlines"]
        PUB["EventPublisher → RedisEventPublisher<br/>serialize EventEnvelope(publicId, event)"]
        RELAY["LiveSessionStompRelay<br/>(MessageListener on every instance)"]
        BROKER["Spring SimpleBroker<br/>/topic/liveSession/{publicId}<br/>(in-memory, local subs only)"]
    end

    subgraph mongo["MongoDB (durable)"]
        LS[("LiveSessions<br/>status · roster · deck snapshot")]
        PART[("participants")]
        ANS[("answers")]
        RR[("round_results")]
    end

    subgraph redis["Redis (volatile live state)"]
        LOCK[["lock<br/>SET NX + Lua release · 10s"]]
        STATE[["state — LiveRoundState<br/>phase · currentSlideId · startedAt<br/>durationMs · pausedAt · accumulatedPauseMs · autoPaused · 6h"]]
        TALLY[["tally — HINCRBY per option · 6h"]]
        ANSW[["answers — HSET by participantId · 6h"]]
        PRES[["presence — HSET by participantId · 6h"]]
        DEAD[["deadlines — ZSET, score = due epochMillis<br/>close:{sid}:{slideId} · hostAway:{sid} · graceCancel:{sid}"]]
        LEADER[["deadline-leader — SET NX PX lease · 15s"]]
        CHAN(("pub/sub channel<br/>ambi:session:events"))
    end

    REST -->|host/participant action| ORCH

    ORCH -->|withLock| LOCK
    ORCH -->|load/save| STATE
    ORCH -->|increment/clear| TALLY
    ORCH -->|submit/clear| ANSW
    ORCH -->|save/remove/clear| PRES
    ORCH -->|schedule/cancel round + host-liveness deadlines| DEAD
    ORCH -->|persist lifecycle/roster| LS
    ORCH --> PART
    ORCH -->|flush answers on close| ANS
    ORCH -->|persist scored RoundResult| RR

    SCHED -->|claim/renew leadership| LEADER
    SCHED -->|atomic pop-due (Lua)| DEAD
    SCHED -->|dispatch: closeSubmissions ·<br/>hostPresenceLost · hostGraceExpired| ORCH

    ORCH -->|publish event| PUB
    PUB -->|convertAndSend JSON| CHAN
    CHAN -->|fan-out to ALL instances| RELAY
    RELAY -->|convertAndSend<br/>/topic/liveSession/{publicId}| BROKER
    BROKER -->|push event| WS

    WS -. SUBSCRIBE frame .-> AUTH["SubscribeAuthInterceptor<br/>on the session roster"]
```

## Event publish sequence (e.g. `startRound`)

```mermaid
sequenceDiagram
    autonumber
    participant Host
    participant ORCH as LiveSessionOrchestrator
    participant LOCK as Redis lock
    participant STATE as Redis state
    participant TALLY as Redis tally
    participant PUB as RedisEventPublisher
    participant CHAN as Redis channel<br/>ambi:session:events
    participant RELAY as StompRelay<br/>(every instance)
    participant BROKER as SimpleBroker
    participant Clients as WS subscribers

    Host->>ORCH: POST /api/liveSessions/{id}/rounds/{slideId}
    ORCH->>LOCK: tryAcquire (SET NX, 10s)
    activate LOCK
    ORCH->>STATE: load(sessionId) → LiveRoundState
    ORCH->>TALLY: clear(sessionId, slideId)
    ORCH->>STATE: save(current.startedRound(slideId, now))
    ORCH->>PUB: publish(publicId, RoundStarted)
    ORCH->>LOCK: release (Lua compare-and-delete)
    deactivate LOCK

    PUB->>CHAN: convertAndSend EventEnvelope(publicId, event)
    CHAN-->>RELAY: deliver to every instance's relay
    RELAY->>BROKER: convertAndSend /topic/liveSession/{publicId}, event
    BROKER-->>Clients: RoundStarted pushed to local subscribers
```

## Round timer auto-close (ADR 002)

Opening a round with a positive `countdownTime` arms a `close:{sessionId}:{slideId}`
deadline in the same locked transition that saves `LiveRoundState`. Every app
instance runs `DeadlineScheduler.poll()`, but only the leader drains the ZSET —
so exactly one instance ever dispatches a given deadline. Full decision: see
[ADR 002](decisions/002-live-session-round-timers.md).

```mermaid
sequenceDiagram
    autonumber
    participant SCHED as DeadlineScheduler (leader)
    participant DEAD as Redis deadlines ZSET
    participant ORCH as LiveSessionOrchestrator
    participant LOCK as Redis lock
    participant STATE as Redis state
    participant PUB as RedisEventPublisher

    loop every poll-interval (default 1s)
        SCHED->>DEAD: tryLead (SET NX PX / renew-if-mine)
        SCHED->>DEAD: popDue(now, batchSize) — atomic ZRANGEBYSCORE + ZREM (Lua)
        DEAD-->>SCHED: due deadlines (e.g. close:{sid}:{slideId})
        SCHED->>ORCH: closeSubmissions(sessionId, slideId)
        ORCH->>LOCK: tryAcquire
        activate LOCK
        ORCH->>STATE: load → slideId still current? not already closed?
        ORCH->>STATE: save(closed phase) · cancel the deadline entry
        Note over ORCH: scoreAndPersistRound (flush answers, grade, award points)
        ORCH->>PUB: publish(publicId, SubmissionsLocked / ResponsesRevealed)
        ORCH->>LOCK: release
        deactivate LOCK
    end
```

A `SESSION_LOCKED` conflict (the host closed manually in the same instant)
re-schedules the deadline `retryDelay` (default 2s) out rather than dropping it;
a vanished/terminal session drops it. Host-disconnect liveness
(`hostAway:{sessionId}` fires `hostPresenceLost` — auto-pause + arm the grace
countdown; `graceCancel:{sessionId}` fires `hostGraceExpired` — cancel the
session) rides the same poller and dispatch, just with different orchestrator
targets.

## Notes

- **Two stores, two jobs.** Mongo holds the durable aggregate (lifecycle, roster,
  deck snapshot); Redis holds all volatile live state — round phase, tallies,
  answers, and presence on 6h TTLs, plus the no-TTL deadline ZSET (ADR 002),
  cleaned up by the transitions that consume or supersede its entries — with a
  10s lock lease.
- **A single leader drains the deadline ZSET.** `DeadlineScheduler` runs on every
  instance but only the Redis-lease holder (`SET NX PX` + compare-and-renew, 15s)
  pops due entries, so two instances never race to fire the same round-close or
  host-liveness deadline.
- **Orchestrator never touches transport.** It only calls
  `EventPublisher.publish(publicId, event)`. The `publicId` rides on
  `LiveRoundState`, so a locked transition already has the topic handle without an
  extra Mongo read.
- **One Redis channel, relay-side routing.** `RedisEventPublisher` writes every event
  to the single `ambi:session:events` channel; every instance's
  `LiveSessionStompRelay` receives it and re-emits to `/topic/liveSession/{publicId}`
  on its **local** SimpleBroker. That's the multi-instance fan-out, with no
  self-skip/dedup needed.
- **`submitAnswer` is the lock-free path.** A single `HSET` (answer) + `HINCRBY`
  (tally) + `TallyUpdated`, deliberately not going through `withLock`.
