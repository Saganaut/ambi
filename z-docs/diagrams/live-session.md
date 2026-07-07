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
`LiveSessionAnswerService`, `LiveSessionOrchestrator`, `SessionLocks`,
`TallyStore`, `AnswerStore`, `LiveRoundStateStore`, `PresenceStore`,
`QAndAHostAnswerStore`, `RedisEventPublisher`, `LiveSessionStompRelay`,
`SubscribeAuthInterceptor`.

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
    REVEAL_RESULTS --> SUBMIT : restartRound
    REVEAL_RESULTS --> [*] : next slide / end

    note right of SUBMIT
        acceptsSubmissions() = true
        for SUBMIT and SUBMIT_LIVE only
    end note
```

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
    PUB->>R: convertAndSend ambi:session:events
    R->>RELAY: message on channel
    RELAY->>WS: /topic/liveSession/{publicId} → TallyUpdated
```

## Redis stores at runtime

```mermaid
flowchart LR
    ORCH["LiveSessionOrchestrator"]
    subgraph redis["Redis (volatile, ~6h TTL)"]
        LOCK[["lock<br/>ambi:lock:{sid} · SET NX · 10s lease"]]
        STATE[["roundState<br/>ambi:roundState:{sid} · JSON"]]
        TALLY[["tally<br/>ambi:tally:{sid}:{slideId} · HINCRBY"]]
        ANS[["answers<br/>ambi:answers:{sid}:{slideId} · HSET"]]
        QANDA[["qa-host-answers<br/>ambi:session:qa-host-answers:{sid}:{slideId} · HSET, never flushed to Mongo"]]
        PRES[["presence<br/>ambi:presence:{sid} · HSET"]]
        CHAN(("pub/sub<br/>ambi:session:events"))
    end
    ORCH -->|"withLock (transitions)"| LOCK
    ORCH -->|read/write| STATE
    ORCH -->|"lock-free"| TALLY
    ORCH -->|"lock-free"| ANS
    ORCH -->|"lock-free"| QANDA
    ORCH --> PRES
    ORCH -->|publish| CHAN
```

## Event catalog

| Event | Trigger | Locked? |
|---|---|---|
| `LiveSessionStarted` | host starts | yes |
| `ParticipantJoined` / `Left` / `Reconnected` / `Removed` | roster change | yes |
| `PresenceChanged` | heartbeat / socket | no |
| `RoundStarted` | round opens (hidden) | yes |
| `LiveResultsShown` | opened live / mid-round go-live | yes |
| `TallyUpdated` | answer submitted | **no** |
| `QAndAUpdated` | Q&A question asked, or host answered/cleared one | **no** |
| `SubmissionsLocked` | submissions closed (hidden) | yes |
| `ResponsesRevealed` | responses shown | yes |
| `ResultsRevealed` | scored reveal | yes |
| `RoundRestarted` | round restarted | yes |
| `LiveSessionEnded` / `Cancelled` | session terminal | yes |
