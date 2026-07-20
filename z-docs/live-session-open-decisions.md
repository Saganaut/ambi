# Live Session — Open Decisions

**Status:** Mostly implemented — historical decision log · **Date:** 2026-06-18
(updated 2026-07-12)

A holistic review of `backend/.../session/liveSession/` (and the surrounding
`session/` package) ahead of implementation. The durable + volatile split (Mongo
aggregates + Redis runtime stores), the scoring pipeline (`RoundEvaluator` →
`Participant.awardPoints` → `RoundResult.compute`), and the lock protocol are in
good shape. What's missing is everything that *connects* those pieces to clients
and to each other — plus several modeling questions the stubs are deferring.

Each item below states the decision, why it matters, and a **Suggestion**. The
suggestions are starting positions, not settled ADRs — promote the ones we adopt
into `decisions/`.

**As of 2026-07-12, the transport/orchestration spine, the target method
surface, grading, scoring, and most of the persistence/correctness items below
are built.** Items are marked ✅ RESOLVED in place with a one-line as-built note;
the decision history is kept rather than deleted. Genuinely open items (timers,
game-type scope beyond what's graded, deception/voting, capacity limits,
`SessionLifecycleProjector`) remain unmarked.

---

## Resolved (2026-06-29) — orchestrator target surface

Decisions locked this session and reflected in code:

- **Session open vs play are two methods.** `createSession(hostUserId, deck)`
  opens the lobby; `beginPlay(sessionId)` starts play (LOBBY → IN_PROGRESS). The
  old `startLiveSession` (seed idle Redis state) folds into `createSession`.
- **Two reveal phases.** `RoundPhase` split `REVEAL` →
  `REVEAL_RESPONSES` (answers/tally shown, unscored) and `REVEAL_RESULTS`
  (scored). Enum updated.
- **Follow-up rounds via parent/child slides.** A parent reveals its responses,
  play advances into the linked child round, and the combined `REVEAL_RESULTS`
  shows both. A parent slide is never taken straight to results. Resolved
  **statelessly** from `Slide.parentId` on the open slide — nothing extra is
  carried in `LiveRoundState` (B3 / F2).
- **Renamed `DeckRunLifecycle` → `LiveSessionLifecycle`** and **dropped its
  `RESULTS` value** (resolves B2). The end-of-game results view is the last slide
  sitting in `RoundPhase.REVEAL_RESULTS` while the session stays `IN_PROGRESS`;
  finishing is the explicit `endLiveSession()` host action.
  `showResults()`/`resume()` deleted; `isLive()` is now `status == IN_PROGRESS`.
  **Obligation:** `advance()` and the `SessionEvent` must signal the *terminal*
  round so the client renders the final podium without a dedicated status.
- **`EventPublisher` seam built now** (A1). `session/event/EventPublisher` +
  `SessionEvent` (marker) exist; the orchestrator depends on the interface and
  publishes after every successful transition. Concrete event records + the
  multi-instance Redis bridge (A2) land with the transport layer.

### Target method surface (`LiveSessionOrchestrator`)

> ✅ **RESOLVED** — all methods below are implemented on `LiveSessionOrchestrator`
> (not stubbed with `UnsupportedOperationException`). `startRound` is state-guarded
> via `requireRoundOpenable`; `closeSubmissions` flushes answers to Mongo and
> scores via `scoreAndPersistRound`; `restartRound` rejects a round that's already
> been scored (`ConflictException("ROUND_ALREADY_SCORED", …)`) rather than
> re-scoring it. The table below is kept as the as-designed contract for
> reference.

| Method | Contract | Ref |
| --- | --- | --- |
| `createSession(hostUserId, deck) → LiveSession` | create aggregate + host participant, persist, seed idle Redis, publish | F1 |
| `beginPlay(sessionId)` | `LiveSession.start()`, publish | — |
| `endLiveSession(sessionId)` | → FINISHED, clear Redis, publish | E2 |
| `cancelSession(sessionId)` | → CANCELLED, clear Redis, publish | F5 |
| `join(roomCode, userId, displayName, avatar, colorTag) → Participant` | create participant, roster + presence, issue token, publish | C2, C4 |
| `leave(sessionId, participantId)` | roster + presence removal, publish | C3 |
| `reconnect(sessionId, participantId) → Participant` | re-identify (needs `findByParticipantId`), mark online | C2 |
| `heartbeat(sessionId, participantId)` | refresh presence, debounced | F5 |
| `startRound(sessionId, slideId)` | open SUBMIT, clear tally, state-guarded (`requireRoundOpenable`) | F4 |
| `submitAnswer(sessionId, slideId, participantId, payload)` | `AnswerStore.submit` **and** `TallyStore.increment`, publish tally | D5 |
| `closeSubmissions(sessionId, slideId)` | SUBMIT → REVEAL_RESPONSES, flushes answers to Mongo and scores via `scoreAndPersistRound` (replaces `endRound`) | E1, E4 |
| `revealResults(sessionId, slideId)` | (any non-results phase) → REVEAL_RESULTS, closing + scoring an open round first; combined results for follow-ups; signal terminal | B2, B3 |
| `restartRound(sessionId, slideId)` | fresh start, tally cleared; rejects (`ROUND_ALREADY_SCORED`) if the round was already scored | F2 |
| `advance(sessionId) → Slide` | server-owned next slide (Lexorank + parent→child), open round, signal terminal | B3 |
| `goTo(sessionId, slideId)` | validate slideId against snapshot, open round | B3 |

Reserved (deferred): `submitVote` + `RoundPhase.VOTE` (D3); `pauseTimer`/
`resumeTimer` + `DeadlineScheduler` (A3, decide pause field first).

---

## A. Transport / orchestration spine (mostly unbuilt)

> ✅ **A1/A2 RESOLVED (built).** A full controller/service/WebSocket/event layer
> now exists under `session/`: `LiveSessionController` (`@RequestMapping
> "/api/liveSessions"`) fronts `LiveSessionHostService`, `LiveSessionLobbyService`,
> `LiveSessionPresenceService`, `LiveSessionSnapshotService`, and
> `LiveSessionAnswerService`. `session/transport/WebSocketConfig` registers a
> native `/ws` STOMP endpoint with a `/topic` `SimpleBroker`, guarded by
> `SubscribeAuthInterceptor`. `SessionPubSubConfig` + `LiveSessionStompRelay`
> bridge `RedisEventPublisher`'s `ambi:session:events` channel to every
> instance's local broker, so the multi-instance fan-out from A2 is implemented as
> designed below. See [live-session-flow](live-session-flow.md) for the full
> sequence.

There is **no controller, service, WebSocket, or event layer** under `session/`.
Everything that exists is domain + storage. These are the most structural calls.

### A1. How do clients learn of state changes?

`LiveSessionOrchestrator` mutates Redis but notifies no one. The README lists an
`EventPublisher`; it doesn't exist. The `spring-websocket` dependency is present
but (per AGENTS.md) no endpoints are implemented.

**Suggestion:** Use **STOMP-over-WebSocket** with a per-session topic
(`/topic/liveSession/{publicId}`) for host/participant broadcasts, plus a small REST
surface for commands (join, start, submit, reveal) so non-realtime actions stay
debuggable in Swagger. Define an `EventPublisher` interface now with a single
`publish(sessionId, SessionEvent)` method; the orchestrator depends on the
interface, not the transport. Avoid polling — round reveal/scoreboard updates are
inherently push.

### A2. Multi-instance event fan-out

The lock README explicitly assumes "two app instances." WebSocket connections are
pinned to one instance, so a change on instance A must reach subscribers on B.

**Suggestion:** Bridge via **Redis pub/sub** (we already run Redis): the
`EventPublisher` writes both to the local STOMP broker and to a Redis channel; a
listener on each instance re-broadcasts locally. For v1, if we commit to a
**single instance**, document that explicitly and gate the bridge behind a
follow-up — but keep `EventPublisher` as the seam so adding the bridge is a
one-class change.

### A3. Timers / `DeadlineScheduler`

Stubbed in the orchestrator; `Round.pauseTimer/resumeTimer` are stubs.
`LiveRoundState` has `roundStartedAt` but **no deadline, duration, or
paused-accumulator**.

**Suggestion:** Decide first whether rounds are **host-driven** (no auto-close)
or **timed**. For v1, recommend **host-driven with an optional soft timer**
surfaced to clients for display only — the host still presses reveal. If/when
auto-close lands: store deadlines in a **Redis ZSET** (`score = epochMillis`)
polled by a single leader instance, and add `durationMs` + `pausedAt` +
`accumulatedPauseMs` to `LiveRoundState`. Adding pause later is a record change,
so decide pause support **now** even if the timer is deferred.

---

## B. State-model reconciliation (overlapping representations)

### B1. `Round.java` vs `LiveSessionOrchestrator`

> ✅ **RESOLVED (as suggested).** `LiveSessionOrchestrator` is the seam `Round`
> collapsed into: all round transitions (`startRound`, `submitAnswer`,
> `closeSubmissions`, `revealResponses`, `revealResults`, `restartRound`) live
> there against Redis + `RoundEvaluator`/`RoundScorer`. The dead
> `session/liveSession/Round.java` stub (`UnsupportedOperationException` on
> every method, nothing constructing or calling it) was deleted 2026-07-20; its
> only genuinely unbuilt operations remain deferred as D3 (`submitVote`) and A3
> (`pauseTimer`/`resumeTimer`).

`Round` is a stub (`submitAnswer/submitVote/pauseTimer/restartRound/
revealRoundResponses/revealRoundResults`), but the orchestrator already owns
`startRound/endRound/restartRound` against Redis. They overlap.

**Suggestion:** **Collapse `Round` into the orchestrator + stores.** A round has
no durable document and no identity beyond `(sessionId, slideId)`, so a separate
object earns little and duplicates transitions. Keep round *logic* that is pure
(grading, choice rendering) in `RoundEvaluator`; keep *transitions* in the
orchestrator. Delete `Round.java` (or reduce it to a value/DTO if one is needed
for the reveal payload).

### B2. `DeckRunLifecycle.RESULTS` vs `RoundPhase.REVEAL`

> **RESOLVED (2026-06-29):** renamed `DeckRunLifecycle` → `LiveSessionLifecycle`
> and dropped its `RESULTS` value; `REVEAL_RESULTS` + `FINISHED` cover it. See the
> [Resolved](#resolved-2026-06-29--orchestrator-target-surface) section.

`LiveSession.showResults()/resume()` toggle *status* IN_PROGRESS↔RESULTS, while
`orchestrator.endRound` toggles *phase* SUBMIT→REVEAL in Redis. Two notions of
"showing results," and nothing calls `showResults()`.

**Suggestion:** Treat them as **different altitudes** and make it explicit:
`RoundPhase.REVEAL` = "this round's answers/results are shown" (the common case);
`DeckRunLifecycle.RESULTS` = "session-level final scoreboard / leaderboard
screen" reached once at the end. If we don't need a distinct end-of-game screen
state, **drop `RESULTS` from `DeckRunLifecycle`** and let REVEAL on the last
slide + FINISHED cover it. Either way, Redis `LiveRoundState` stays authoritative
and `LiveSession.recordPhase()` is only a write-back snapshot (see E2).

### B3. Slide navigation authority

`orchestrator.startRound(sessionId, slideId)` takes an arbitrary slide id. But
`Slide` has `sortOrder` (Lexorank) and `parentId/childId` with the rule *"if a
slide has a child we should never go straight to results"* and *"must be
sequential."*

**Suggestion:** Make the **server own navigation**. Add `advance(sessionId)` /
`goTo(sessionId, slideId)` that resolves the next slide from the snapshot's
sorted order and enforces the linked parent→child rule (a parent must reveal into
its child before results). Validate any host-supplied `slideId` against the
snapshot rather than trusting it. Keep the ordering logic reading the same
Lexorank rules as the deck editor.

---

## C. Participant identity (most under-specified)

### C1. Reuse vs per-session participant

Explicit TODO in `Participant.java`. `findByUserId` + `resetParticipant()` imply
**reuse**; the per-session model implies fresh instances.

**Suggestion:** **One participant document per (session, user) — no reuse.** A
session is a one-time deck run; reusing an instance across runs blurs history and
forces `resetParticipant()` semantics. Drop `resetParticipant()` for v1. This
makes per-session stats, bans, and scores immutable history.

### C2. The `userId`-stripping contradiction

For this we we want to add a findByParticipantId method

README says `userId` is *stripped while live*, yet `findByUserId` is the only
lookup — so a reconnecting user can't be found mid-session, and there's no
re-identification mechanism. Also a security concern (impersonation).

**Suggestion:** **Don't strip `userId` on the stored document; strip it only on
the wire** (DTOs sent to other participants). Keep a server-side index
`(sessionId, userId) → participantId` so a reconnecting authenticated user maps
back deterministically. For guests, mint a signed **participant token** (cookie)
at join that carries `participantId`; reconnection presents the token. Never
trust a client-supplied `participantId` without the token/user match.

### C3. Live source of truth for the roster + scores

README says `Participant` "lives in Redis for the duration," but there is **no
participant store in Redis** — only `PresenceStore`. Today: `roster` holds ids,
presence holds connection state, scores live on the Mongo doc.

**Suggestion:** Split cleanly by write pattern (same philosophy as the
tally/state split already documented):

- **`LiveSession.roster`** (Mongo) = authoritative membership (ids).
- **`PresenceStore`** (Redis) = volatile connection/heartbeat state.
- **Scores** = mutated on the `Participant` doc at round close (low frequency, at
  the lock boundary), not per-keystroke.

So *don't* add a Redis participant blob; read profile/score from Mongo, liveness
from presence. If lobby reads become hot, add a denormalised read-model later.

### C4. Guest vs registered join + room code vs invite token

> ✅ **RESOLVED (as suggested, single-code).** `inviteToken` has been removed
> from `LiveSession` entirely (its field, constructor line, and
> `regenerateInviteToken()` are commented out / gone — see F1). `roomCode` is now
> the only join code, unique-indexed, and doubles as the URL-embeddable link per
> the "yes we only need one code" call below. `join(roomCode, userId,
> displayName, avatar, colorTag)` is implemented on the orchestrator.

Yes we only need one code here really. The room code can be used in a URL

`roomCode` (human-typed) and `inviteToken` (link) both exist with rotate methods;
nothing consumes them.

**Suggestion:** **Room code = public join** (type code + display name, guest
allowed). **Invite token = direct link** carrying the same room into a one-click
join. Both routes converge on one `join` service that creates the participant and
issues the participant token (C2). Require a display name; allow guests by
default, with a deck/`AudienceSettings` flag to restrict to authenticated users.

---

## D. Scoring & game-type scope

### D1. The grading SEAM is stale — and unblocks scope

> ✅ **RESOLVED (exceeded).** `RoundEvaluator.isCorrect` grades MCQ (exact-set
> match against `McqContent.correctOptionIds`), Number (`EXACT`/`RANGE`), Text
> (`EXACT`/`CONTAINS`), Ranking, Matching, Grid (all `ScoreMode.EXACT`), Axis and
> PlaceOnImage (`INSIDE_RADIUS`), Scales, and Allocation (± tolerance) — not just
> MCQ. Only content with no static key (FollowUp, Drawing, Q&A) or
> relative/partial-credit scoring modes (`CLOSEST`, `NEAREST`, `DISTANCE`,
> `PARTIAL`) remain explicit false-returning seams.

`RoundEvaluator.isCorrect()` always returns `false`, with a comment that
"SlideContent is not yet a field on `Slide`." **It is now** — `Slide.content`
exists and `McqContent.correctOptionIds` is the answer key. MCQ grading is
implementable today.

**Suggestion:** Implement MCQ grading immediately against
`McqContent.correctOptionIds` (exact-set match for multi-correct). Update/remove
the stale comment. Treat this as a quick win (see punch list).

### D2. Which game types ship in v1?

> ✅ **RESOLVED (exceeded the v1 suggestion).** Grading landed for MCQ, Number,
> Text, Ranking, Matching, Grid, Axis, Scales, Allocation, and PlaceOnImage (see
> D1) — well past the MCQ + Number recommendation below. `describeChoice` (the
> tally-key renderer) still only renders the scalar-keyed types (MCQ, Number,
> Text); map/coordinate answers (Matching, Grid, Scales, PlaceOnImage,
> Allocation, Ranking) grade correctly but aren't tallied as an option-count bar.
> Drawing/Q&A/FollowUp remain non-scorable display types, deferred with D3.

There are ~13 `AnswerPayload` types (Allocation, Drawing, Grid, Matching,
Ranking, Scales, PlaceOnImage, …) but only MCQ is rendered in `describeChoice`.

**Suggestion:** **v1 = MCQ + Number** (both have unambiguous keys and tally
cleanly), with Q&A/Title/Media as non-scorable display slides. Design grading as
a **typed dispatch** — a `Grader` resolved per `SlideContent`/`AnswerPayload`
subtype (pattern-match switch over the sealed payload hierarchy), not growing
`instanceof` chains in `RoundEvaluator`. Each new type = one `Grader`. Defer the
open-ended/creative types (Drawing, free text) until voting exists (D3).

### D3. Best-answer & deception are hard-coded off

**Still open.** `AnswerEvaluation.bestAnswer=false`, `deceivedCount=0` remain
hard-coded in `RoundEvaluator.evaluate`; `Round.submitVote` is still a stub.
`RoundPhase` has grown since this was written — it's now `SUBMIT`,
`SUBMIT_LIVE`, `LOCKED`, `REVEAL_RESPONSES`, `REVEAL_RESULTS` — but there is
still **no `VOTE` phase**, so the suggestion below stands.

`AnswerEvaluation.bestAnswer=false`, `deceivedCount=0`; `Round.submitVote` is a
stub; `RoundPhase` has only `SUBMIT`/`REVEAL` — **no VOTE phase**.

**Suggestion:** **Defer deception/best-answer past v1**, but reserve the seam now:
the evaluation already carries `bestAnswer`/`deceivedCount`, so leave them. When
adopted, add `RoundPhase.VOTE` (SUBMIT → VOTE → REVEAL), a `VoteStore`
(Redis hash, like answers), and fold vote tallies into `RoundEvaluator`. Decide
the enum addition consciously — adding a phase later touches the orchestrator and
every phase switch.

### D4. `streakBonuses` shape mismatch

> ✅ **RESOLVED (as suggested).** No TODO remains in `RoundScorer`.
> `Participant.awardPoints(..., Map<Integer, Integer> streakBonuses)` takes the
> map shape directly (keyed by streak length; may be `null`), matching how
> `PointSettings` resolves bonuses — no index hazard, no null hand-off. Streak
> bonuses apply.

Explicit TODO in `RoundScorer`: `PointSettings.streakBonuses` is
`Map<Integer, StreakMilestone>` but `Participant.awardPoints` takes a `List` —
so `null` is passed and **streak bonuses never apply**. `awardPoints` also does
`streakBonuses.get(activeStreak)` (List-by-index is IndexOutOfBounds-prone).

**Suggestion:** **Standardise on `Map<Integer, StreakMilestone>`** (keyed by
streak length). Change `awardPoints` to take the map and do `map.get(streak)`
(null = no milestone). Removes the index hazard and the null hand-off in one
edit. Quick win.

### D5. Tally double-bookkeeping

> ✅ **Partially resolved — `TallyStore` is now incremented.**
> `LiveSessionOrchestrator.submitAnswer` calls `tallyStore.increment` (and
> `decrement` to back out a superseded choice) via the shared `AnswerTallyKeys`
> helper, so submit-time and scoring-time key derivation agree (the "shared
> helper" suggestion below is implemented). The live-vs-durable duplication
> itself is intentional per the suggestion, not eliminated. Still worth
> revisiting if the two ever measurably disagree in practice.

This deserves more investigation before making a decision

`TallyStore` is bumped per submission (lock-free `HINCRBY`), but
`RoundResult.tallyOptions()` *recomputes* counts from outcomes at scoring time —
two tallies that can disagree. And **nobody currently increments `TallyStore`**:
`AnswerStore.submit` writes the answer but not the tally, and the choice-key
logic (`describeChoice`) lives in `RoundEvaluator`, not at submit.

**Suggestion:** **Make `TallyStore` the live (pre-reveal) source for the
in-progress bar chart, and `RoundResult.optionCounts` the durable record** —
they serve different moments, so the duplication is acceptable *if* they're
derived consistently. Move `describeChoice`/choice-key derivation into a shared
helper used by both submit-time tally and scoring. If we don't need a live
in-progress chart, **drop `TallyStore`** and reveal straight from the recomputed
`RoundResult`. Decide based on whether the host UI shows counts *before* reveal.

---

## E. Persistence, projection & recovery

### E1. `AnswerRepository` won't compile as a repository

> ✅ **RESOLVED (as suggested).** `AnswerRepository` is
> `interface AnswerRepository extends MongoRepository<Answer, String>` with
> `findBySessionId` and `findBySessionIdAndSlideId`, exactly as suggested. The
> Redis→Mongo flush happens in `RoundResultProjector.persist`, called from
> `LiveSessionOrchestrator.scoreAndPersistRound` at round close, inside the lock,
> before scoring is finalized.

It's an empty *class*, not an interface extending `MongoRepository` (explicit
TODO). The Redis→Mongo flush path doesn't exist.

**Suggestion:** Make it
`interface AnswerRepository extends MongoRepository<Answer, String>` with
`findBySessionIdAndSlideId` and `findBySessionId`. Flush from `AnswerStore` to
Mongo at **round close**, inside the lock, before scoring. Quick win.

### E2. Projectors don't exist

> ✅ **`RoundResultProjector` RESOLVED (built and wired).**
> `session/roundResult/RoundResultProjector.persist(RoundResult, List<Participant>,
> List<Answer>)` is called from `LiveSessionOrchestrator.scoreAndPersistRound`
> (invoked from both `closeSubmissions` and `revealResults`) — it saves the
> flushed answers, the mutated participants, and the `RoundResult` together, and
> the score-once guard (F2) keeps re-running a close from double-applying.
> **`SessionLifecycleProjector` is still genuinely unbuilt** — no such class
> exists; `LiveSession` lifecycle/roster persistence happens via direct
> `repo.save(session)` calls inside `LiveSessionOrchestrator` rather than through
> a dedicated projector. This half of E2 stays open.

README names `RoundResultProjector` and `SessionLifecycleProjector`; neither is
built. Nothing calls `recordPhase()`, `showResults()`, participant saves, or the
Redis `clear()` methods.

**Suggestion:** Implement two thin projectors driven by orchestrator events:

- **`SessionLifecycleProjector`** — persists `LiveSession` status/phase snapshot
  on lifecycle transitions and on join (roster change).
- **`RoundResultProjector`** — on round close, persists the `RoundResult` +
  mutated participants, then clears the round's Redis answer/tally keys.

Keep them idempotent (re-running a close shouldn't double-apply — see F2).

### E3. Recovery story

README claims Redis-failure recovery from Mongo, but mid-round answers live
**only** in Redis (flush is at round boundaries).

**Suggestion:** Accept a **bounded loss window = current open round** for v1 and
say so explicitly. Recovery = rebuild `LiveRoundState`/roster from the last Mongo
snapshot; in-flight (unsubmitted-to-Mongo) answers for the open round are lost and
the round restarts. Don't over-engineer continuous answer flushing yet.

### E4. `endRound` scoring wiring

> ✅ **RESOLVED (as suggested).** Scoring runs inline inside the lock via
> `scoreAndPersistRound`, called from both `closeSubmissions` and
> `revealResults`: it resolves points via `SlideSettings.resolvePoints`,
> gathers the participant map from the roster, evaluates via `RoundEvaluator`,
> scores via `RoundScorer`, and hands persistence to `RoundResultProjector` (E2).

Big TODO: `endRound` only flips the phase. Scoring needs answers (E1), the
participants map (C3), resolved `PointSettings`, and the slide from the snapshot.

**Suggestion:** Resolve points via the existing
`SlideSettings.resolvePoints(deckDefaults)` at round close. Run scoring **inline
inside the lock** for v1 (rounds are small; keeps it simple and consistent), then
hand persistence to `RoundResultProjector` (E2). Gather the participant map from
Mongo by `roster` ids. Revisit async scoring only if it measurably blocks.

---

## F. Operational / correctness

### F1. Uniqueness indexes missing

✅ **RESOLVED:** removed the invite token for now and made room code and public
id unique (`@Indexed(unique = true)` on both `roomCode` and `publicId` on
`LiveSession`). See C4 — `inviteToken` is fully gone from the class, not just
unindexed.

`roomCode`/`inviteToken`/`publicId` have **no `@Indexed(unique=true)`** on
`LiveSession` (Deck has them; LiveSession doesn't). `RoomCode.generate()` is
"uniqueness-blind" and *requires* a DB index + collision-retry.

### F2. Re-run `RoundResult` id collision

> ✅ **RESOLVED (stricter than suggested).** Rather than allowing an overwrite,
> `restartRound` now **rejects** restarting a round that's already been scored:
> `LiveSessionOrchestrator.restartRound` throws
> `ConflictException("ROUND_ALREADY_SCORED", …)` if a `RoundResult` already
> exists for `(sessionId, slideId)`. So the id-collision/overwrite scenario this
> item worried about can no longer happen — a scored round is immutable; only an
> unscored, still-open round can be restarted.

`RoundResultId = (sessionId, slideId)`, so `restartRound` **overwrites** the
prior result; linked parent/child slides may also collide.

**Suggestion:** For v1, **overwrite is acceptable and intended** (a restart
replaces the round) — but make scoring idempotent so a double-close doesn't
double-award participant points. If we later need restart history, add an
`attempt` to the id. Document the overwrite explicitly.

### F3. Deck snapshot size

The *entire* `Deck` is frozen into the `LiveSession` document (16MB Mongo limit).
Images are S3 refs (`AppImage`), so likely fine.

**Suggestion:** Keep the full snapshot (it's what makes a run immutable against
later deck edits), but **confirm images are references, not blobs** (they are),
and add a guard/log if a snapshot exceeds a safe threshold (e.g. 8MB). Revisit
only if real decks approach the limit.

### F4. Idempotency of host actions

> ✅ **RESOLVED (as suggested).** Transitions are now state-guarded, mirroring
> `LiveSession`'s `requireStatus` pattern: `startRound`/`goTo`/`advance` go
> through `requireRoundOpenable`, which rejects opening a different slide while
> a round is still accepting submissions. `closeSubmissions` and `revealResults`
> are idempotent closes (re-running a close on an already-closed/scored round is
> a no-op / doesn't re-score — see F2). Combined with F2's reject-on-restart,
> double-clicks are safe.

Transitions are lock-guarded but not state-guarded — `startRound` while a round
is live silently overwrites it.

**Suggestion:** Add **state guards** mirroring `LiveSession`'s `requireStatus`
pattern: `startRound` rejects (or no-ops) if a round is already open on a
different slide; `endRound` no-ops if already in REVEAL. Combined with F2's
idempotent scoring, double-clicks become safe.

### F5. Capacity & abuse

No max participants, no concurrent-session cap, no rate limits on submit/
heartbeat, no host-disconnect policy. `AudienceSettings`/`ConnectionStatus` hint
at this.

**Suggestion:** v1 limits: a **max roster size** (from `AudienceSettings` or a
sane default), reject joins past it; **debounce heartbeats** server-side
(ignore more than 1/sec per participant); on **host disconnect**, auto-pause the
round and start a grace timer before `cancel()`. Defer host migration. Keep these
as config with conservative defaults.

---

## Recommended ordering (what unblocks the most)

> Historical — kept for context. **A1/A2, C4/F1, and B1 are done** (see above);
> the only item below still genuinely open is the D2/D3 VOTE-phase scope.

1. **A1/A2** transport + fan-out — defines every DTO and the orchestrator's
   notify seam.
2. **C1–C3** participant identity & live source-of-truth — blocks join,
   reconnect, and scoring inputs.
3. **D2/D3** v1 game-type scope — decides whether VOTE phase + multi-type grader
   land now.
4. **B1** collapse `Round` into the orchestrator — avoids building transitions
   twice.

## Quick-win punch list (small, independent, do anytime)

> Historical — kept for context. **All four items below are done** (see D1, D4,
> E1, F1 above).

- **D1** — implement MCQ grading; delete the stale SEAM comment.
- **D4** — switch `awardPoints` streak bonuses to `Map<Integer, StreakMilestone>`.
- **E1** — make `AnswerRepository` a real `MongoRepository` interface.
- **F1** — add unique indexes + room-code collision retry.
