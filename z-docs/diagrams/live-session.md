# Live Session

Real-time interactive play of a deck. A `LiveSession` snapshots the deck at
creation; **durable identity/roster live in MongoDB** while **volatile round
state lives in Redis**. Every state transition publishes a `SessionEvent` that
fans out over one Redis pub/sub channel and is relayed to STOMP subscribers.

> The transport & Redis-store architecture and the `startRound` publish
> sequence are documented in [live-session-flow.md](../live-session-flow.md) —
> this page adds the lifecycle/phase state machines and the join & answer
> sequences. Open questions: [live-session-open-decisions.md](../live-session-open-decisions.md).

Key classes: `LiveSessionController`, `LiveSessionLobbyService`,
`LiveSessionAnswerService`, `LiveSessionHostService` (owns
close/reveal/restart/advance/goTo/pause-timer/resume-timer),
`LiveSessionSnapshotService`, `LiveSessionPresenceService`,
`LiveSessionOrchestrator`, `SessionLocks`, `TallyStore`, `AnswerStore`,
`LiveRoundStateStore`, `PresenceStore`, `QAndAHostAnswerStore`,
`RedisEventPublisher`, `LiveSessionStompRelay`, `SubscribeAuthInterceptor`,
`DeadlineScheduler` / `DeadlineStore` (the round-timer auto-close and
host-disconnect poller — see [ADR 002](../decisions/002-live-session-round-timers.md)
and [live-session-flow](../live-session-flow.md#round-timer-auto-close-adr-002)).

## Session lifecycle

```mermaid
stateDiagram-v2
    [*] --> LOBBY : POST /liveSessions (host)
    LOBBY --> IN_PROGRESS : POST /{id}/start (host)
    LOBBY --> CANCELLED : POST /{id}/cancel
    IN_PROGRESS --> FINISHED : POST /{id}/end (host)
    IN_PROGRESS --> CANCELLED : POST /{id}/cancel
    FINISHED --> [*]
    CANCELLED --> [*]
    note right of LOBBY
        participants join by roomCode;
        each join publishes ParticipantJoined
    end note
```

## Round phase state machine

Per-round phase governs whether submissions are accepted and what viewers see.
Held in Redis `LiveRoundState`; transitions run under the session lock.

```mermaid
stateDiagram-v2
    [*] --> SUBMIT : openRound (hidden)
    [*] --> SUBMIT_LIVE : openRound (IMMEDIATE results)
    SUBMIT --> SUBMIT_LIVE : revealResponses (go live mid-round)
    SUBMIT --> LOCKED : closeSubmissions
    SUBMIT_LIVE --> REVEAL_RESPONSES : closeSubmissions
    LOCKED --> REVEAL_RESPONSES : revealResponses
    REVEAL_RESPONSES --> REVEAL_RESULTS : revealResults (scored)
    LOCKED --> REVEAL_RESULTS : revealResults
    SUBMIT --> REVEAL_RESULTS : revealResults (closes + scores)
    SUBMIT_LIVE --> REVEAL_RESULTS : revealResults (closes + scores)
    LOCKED --> SUBMIT : restartRound (pre-score only)
    REVEAL_RESULTS --> [*] : next slide / end

    note right of SUBMIT
        acceptsSubmissions() = true
        for SUBMIT and SUBMIT_LIVE only.
        A timed round (durationMs set) auto-closes
        via closeSubmissions when its deadline fires
        (ADR 002) — same transition a host click uses.
        pause/resumeTimer freeze/unfreeze the countdown
        without changing phase.
    end note

    note right of REVEAL_RESULTS
        restartRound throws ROUND_ALREADY_SCORED
        once here — revealResults persists a
        RoundResult; restart only succeeds pre-score
        (SUBMIT / SUBMIT_LIVE / LOCKED / REVEAL_RESPONSES)
    end note
```

A slide with an attached follow-up never reaches `REVEAL_RESULTS` on its own:
`revealResults` rejects with `409 REVEAL_BLOCKED_BY_FOLLOW_UP` and the host
closes it and advances into the child instead, which runs this same state
machine as its own ordinary round — see
[follow-up slides § Runtime](../features/follow-up-slides/README.md#runtime).

## Create → join → start

```mermaid
sequenceDiagram
    autonumber
    participant Host
    participant Part as Participant
    participant API as LiveSessionController
    participant LS as LiveSessionLobbyService
    participant ORCH as LiveSessionOrchestrator
    participant M as MongoDB
    participant R as Redis (state + pub/sub)
    participant WS as WS subscribers

    Host->>API: POST /api/liveSessions {deckId}
    API->>LS: createSession (verify deck VIEW)
    LS->>ORCH: createSession(host, deck snapshot)
    ORCH->>M: save host Participant + LiveSession (mint roomCode, publicId)
    ORCH->>R: roundStateStore.save(idle)
    API-->>Host: { roomCode, publicId }

    Part->>WS: SUBSCRIBE /topic/liveSession/{publicId}
    Note over WS: SubscribeAuthInterceptor — authenticated, not VISITOR
    Part->>API: POST /api/liveSessions/join {roomCode}
    API->>ORCH: join → save Participant, add to roster
    ORCH->>R: publish ParticipantJoined
    R-->>WS: fan-out → roster update

    Host->>API: POST /api/liveSessions/{id}/start
    API->>ORCH: beginPlay (withLock: LOBBY → IN_PROGRESS)
    ORCH->>M: save session
    ORCH->>R: publish LiveSessionStarted
    R-->>WS: play begins
```

## Answer submission — lock-free tally

Submissions deliberately skip the session lock; tallies use atomic Redis
`HINCRBY`. The HTTP call returns `202 Accepted` and the updated tally arrives via
WebSocket.

```mermaid
sequenceDiagram
    autonumber
    participant Part as Participant
    participant API as LiveSessionController
    participant AS as LiveSessionAnswerService
    participant ORCH as LiveSessionOrchestrator
    participant R as Redis
    participant PUB as RedisEventPublisher
    participant RELAY as StompRelay (all instances)
    participant WS as WS subscribers

    Part->>API: POST /api/liveSessions/{id}/answers {slideId, payload}
    API->>AS: submit (isLive? · resolve participant · validate payload)
    AS->>ORCH: submitAnswer(...) — no lock taken
    ORCH->>R: roundStateStore.load → phase.acceptsSubmissions()?
    opt multi-select re-submit
        ORCH->>R: tallyStore.decrement(prior options)
    end
    ORCH->>R: answerStore.submit (HSET) + tallyStore.increment (HINCRBY)
    ORCH->>R: tallyStore.tally (HGETALL)
    ORCH->>PUB: publish TallyUpdated(slideId, counts)
    API-->>Part: 202 Accepted (no body)
    PUB->>R: Lua: INCR ambi:session:eventseq:{publicId} + PUBLISH ambi:session:events
    R->>RELAY: message on channel
    RELAY->>WS: /topic/liveSession/{publicId} → SessionEventEnvelope(TallyUpdated)
```

## Redis stores at runtime

```mermaid
flowchart LR
    ORCH["LiveSessionOrchestrator"]
    subgraph redis["Redis (volatile, ~6h TTL)"]
        LOCK[["lock<br/>ambi:session:lock:{sid} · SET NX · 10s lease"]]
        STATE[["roundState<br/>ambi:session:roundstate:{sid} · JSON"]]
        TALLY[["tally<br/>ambi:session:tally:{sid}:{slideId} · HINCRBY"]]
        ANS[["answers<br/>ambi:session:answers:{sid}:{slideId} · HSET"]]
        VOTES[["votes (D3)<br/>ambi:session:votes:{sid}:{slideId}[:options] · HSET"]]
        FOLLOWUP[["followup<br/>ambi:session:followup:{sid}:{slideId} · JSON string (ordered)"]]
        QANDA[["qa-host-answers<br/>ambi:session:qa-host-answers:{sid}:{slideId} · HSET, never flushed to Mongo"]]
        PRES[["presence<br/>ambi:session:presence:{sid} · HSET"]]
        DEAD[["deadlines (ADR 002)<br/>ambi:session:deadlines · global ZSET, no TTL"]]
        LEADER[["deadline-leader (ADR 002)<br/>ambi:session:deadline-leader · SET NX PX · 15s lease"]]
        EVSEQ[["eventSequence<br/>ambi:session:eventseq:{publicId} · INCR"]]
        CHAN(("pub/sub<br/>ambi:session:events"))
    end
    SCHED["DeadlineScheduler<br/>(leader only)"]
    ORCH -->|"withLock (transitions)"| LOCK
    ORCH -->|read/write| STATE
    ORCH -->|"lock-free"| TALLY
    ORCH -->|"lock-free"| ANS
    ORCH -->|"openVoting / submitVote"| VOTES
    ORCH -->|"mint once, on round open"| FOLLOWUP
    ORCH -->|"lock-free"| QANDA
    ORCH --> PRES
    ORCH -->|schedule/cancel| DEAD
    SCHED -->|claim/renew| LEADER
    SCHED -->|pop due (Lua)| DEAD
    SCHED -->|"closeSubmissions ·<br/>hostPresenceLost · hostGraceExpired"| ORCH
    ORCH -->|"publish (atomic INCR + PUBLISH)"| EVSEQ
    ORCH -->|"publish (atomic INCR + PUBLISH)"| CHAN
```

## Event catalog

| Event | Trigger | Locked? |
|---|---|---|
| `LiveSessionStarted` | host starts | yes |
| `ParticipantJoined` | joins by roomCode | **no** |
| `ParticipantLeft` | leaves roster | yes |
| `ParticipantReconnected` | rejoins an existing session | **no** |
| `ParticipantRemoved` | defined, but **never published** (dead) | — |
| `PresenceChanged` | host presence lost (ADR 002 `hostPresenceLost` → `DISCONNECTED`) | yes |
| `RoundStarted` | round opens (hidden); carries `deadline` for a timed round (ADR 002) | yes |
| `LiveResultsShown` | opened live / mid-round go-live; carries `deadline` | yes |
| `TallyUpdated` | answer submitted | **no** |
| `QAndAUpdated` | Q&A question asked, or host answered/cleared one | **no** |
| `SubmissionsLocked` | submissions closed (hidden) | yes |
| `ResponsesRevealed` | responses shown | yes |
| `ResultsRevealed` | scored reveal | yes |
| `RoundRestarted` | round restarted; carries the fresh `deadline` | yes |
| `TimerPaused` | round timer paused (host action or host-disconnect auto-pause, ADR 002) | yes |
| `TimerResumed` | round timer resumed, carrying the recomputed `deadline` (ADR 002) | yes |
| `LiveSessionEnded` / `Cancelled` | session terminal (a disconnected host's expired grace also cancels, ADR 002) | yes |
