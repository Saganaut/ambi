# 13 — InteractiveSession settings & player additions

**Status:** Done (2026-05-21). Backend + field additions landed 2026-05-19; the deferred player/host UI pass landed alongside the new `PUT /api/interactive-sessions/{roomCode}/me/avatar` endpoint and `PlayerPlacement.speedBonusTotal` snapshot.
**Depends on:** 11 (reactions counter), 12 (teamId)
**Unblocks:** 15 (`PlayerAnswer.timeTakenMs` needed for history), 16 (analytics)

## Scope

Catch-all chunk for the field additions that make a live show feel polished: shuffle, auto-advance, podium duration, lobby polish, custom room codes, lobby music, plus the per-player streak/accuracy/timing fields needed for analytics and Kahoot-style streak bonuses.

## Updates to existing models

### InteractiveSession

- `boolean anonymousMode` — hide real names on the leaderboard (use `avatarKey + colorTag` only)
- `String customRoomCode` — host-set; falls back to the auto-generated `roomCode` if blank
- `String hostName, hostAvatarUrl` — denorm so the lobby header doesn't need a user lookup
- `boolean allowReJoin` — disconnected/kicked players can come back
- `int spectatorCount` — viewers without a player slot
- `LocalDateTime lobbyOpenedAt`
- `String exportedReportUrl` — populated when a CSV/PDF report is generated (see chunk 16)

### InteractiveSessionSettings

- `boolean shuffleQuestions` — default `false`
- `boolean shuffleAnswers` — default `true`; per-element override via the question's own `shuffleOptions`
- `boolean autoAdvance` — host doesn't have to click "Next"; default `false`
- `int podiumDuration` — seconds; default `15`
- `int lobbyCountdownSeconds` — default `5`; "Game starts in N..."
- `String lobbyMusicAssetId` — `MediaAsset` reference (chunk 19); nullable
- `boolean requireFullName` — disallow nicknames
- `boolean spectatorsAllowed` — default `false`
- `boolean reactionsEnabled` (if not added in chunk 11)
- `boolean chatEnabled` (if not added in chunk 11)
- `boolean teamMode` (if not added in chunk 12)
- `int teamCount` (if not added in chunk 12)

### InteractiveSessionPlayer

- `Avatar avatar` — unified player avatar (`{ avatarType: KEY | LINK, avatarUrl, avatarKey }`). KEY carries a Kahoot-style preset id (e.g. `"fox-orange"`); LINK carries the player's real picture. Replaced the original standalone `String avatarKey` so consumers read one field instead of branching preset-vs-`pictureUrl`. Stored as an intent marker (LINK leaves `avatarUrl` null; the DTO materializes it from `UserSnapshot.pictureUrl`). See the deferred note below — preset KEY image assets are not served yet.
- `String colorTag` — assigned in lobby (color token name)
- `String teamId` — coordinate with chunk 12
- `int longestStreak, currentStreak` — track across rounds
- `double accuracy` — `correctAnswers / answeredQuestions`, recomputed on each answer
- `int reactionsSent` — coordinate with chunk 11
- `boolean lateJoin` — joined after the show started
- `boolean disconnected` — currently disconnected
- `LocalDateTime lastSeenAt` — updated by PresenceService heartbeats
- `int speedBonusTotal` — total speed bonus points accumulated

### PlayerAnswer

- `long timeTakenMs` — answer arrival time minus `roundStartedAt`. **Critical** for history + analytics — measure now, even if speed bonus is off.
- `int streakBeforeAnswer` — for "5x streak!" displays at reveal
- `int speedBonusAwarded` — separate from base points
- `boolean usedPowerUp` — placeholder for future power-up chunk
- `String powerUpId` — nullable

### PlayerPlacement

- `String teamId`
- `int longestStreak`
- `double accuracy`
- `int reactionsSent`

## Backend changes

- `InteractiveSessionService.startRound` — when `settings.shuffleQuestions`, pre-shuffle `InteractiveSession.deckSnapshot` once at game start (not per-round, so the elementId order is stable). When `settings.shuffleAnswers`, pass a per-player deterministic shuffle to `ElementRedactor` (see chunk 10).
- `InteractiveSessionService.recordAnswer`:
  - Compute `timeTakenMs = answeredAt - roundStartedAt`
  - Compute `speedBonus` from `settings.speedBonus` if true: `bonus = round(pointValue * 0.5 * (1 - timeTakenMs / timePerQuestionMs))`, clamped to ≥ 0
  - Update `currentStreak` (increment on correct, reset to 0 on incorrect); update `longestStreak = max(longestStreak, currentStreak)`
  - Update `accuracy`
- `InteractiveSessionService.advanceRound`:
  - If `settings.autoAdvance`, schedule a `roundStartedAt + timePerQuestion + podiumDuration` advance via a Spring `@Scheduled` task or per-show `ScheduledFuture` in a session-scoped cache
- `InteractiveSessionService.createInteractiveSession`:
  - If `customRoomCode` is set and unique, use it; else generate
  - Validate avatar pool (a constant list of preset avatar keys; ship 12–20)
- New service: `AvatarService` — list available preset avatars; each is `{ key, displayName, imageUrl, colorTag }`
- `PresenceService` — update `InteractiveSessionPlayer.lastSeenAt` + `disconnected` on WS disconnect / reconnect (chunk dependency on existing `PresenceEventListener`)

## Frontend changes

- InteractiveSession create form:
  - All new toggles in an "Advanced" section
  - Avatar pool dropdown for the player lobby
  - Lobby music picker (chunk 19 dependency)
- Lobby:
  - Avatar grid players pick from (collapse to "Random" if `requireFullName=true` and host wants Kahoot vibes)
  - Custom room code in big text
- Player view:
  - Streak indicator ("3x streak 🔥")
  - Accuracy in the player tile
- Host view:
  - Auto-advance progress ring per phase
  - Podium duration countdown
- Results:
  - Per-player accuracy + longestStreak + speedBonusTotal on the placement card

## Cross-cutting concerns

- **Backwards compat** — every InteractiveSession field gets a default; old documents read as defaults. Maven `@Default` annotation via Lombok or service-layer fallback.
- **Persisting timing** — `roundStartedAt` already exists on InteractiveSession. Use it as the reference time.
- **Streaks reset across rounds, not games** — actually, no — streaks persist across questions but break on a wrong answer. Don't reset between rounds.

## Checklist

- [x] All field additions on InteractiveSession / InteractiveSessionSettings / InteractiveSessionPlayer / PlayerAnswer / PlayerPlacement
- [x] `customRoomCode` validation + collision check — accepts `[A-HJ-NP-Z2-9]{4,8}` via `@Pattern`, falls back to `generateUniqueRoomCode()` on null/blank; collisions throw 409
- [x] `shuffleQuestions` at game start — `startGame` permutes `deckSnapshot` once when `settings.shuffleQuestions=true`; seed is the interactive session id so a backend restart re-derives the same order
- [x] `shuffleAnswers` per-player deterministic — `broadcastRoundStart` now gates the existing per-element `ElementShuffler.shouldShuffle` on `settings.shuffleAnswers` (session-level master switch on top of the chunk-10 per-element opt-in)
- [x] `speedBonusAwarded` calculation — `applySpeedBonus` was refactored to `computeSpeedBonus` (returns bonus only); `submitAnswer` stores it on `PlayerAnswer.speedBonusAwarded` and aggregates into `InteractiveSessionPlayer.speedBonusTotal`
- [x] `currentStreak` / `longestStreak` updates — incremented in `submitAnswer` on correct, reset to 0 on incorrect; `PlayerAnswer.streakBeforeAnswer` captures the pre-application value for reveal UI
- [x] `accuracy` recompute — recomputed in `submitAnswer` as `correctAnswers / answeredQuestions`
- [x] `autoAdvance` scheduling — TURN_BASED only; `advanceRound` schedules `startNextRound` at `+podiumDuration` seconds via the existing `ScheduledExecutorService`. SIMULTANEOUS already auto-advances via the `BETWEEN_ROUNDS_DELAY_SECONDS` path
- [x] `AvatarService` + preset pool — 16-preset static service, `GET /api/avatars` public endpoint, lobby join flow now accepts `{ avatarKey, colorTag }` on `JoinInteractiveSessionRequest`. Unknown keys silently drop (forward-compatible with stale clients)
- [x] Lobby avatar picker — `Lobby.tsx` now mounts `AvatarSelector` for non-host viewers with `options` built from `useListAvatarsQuery()` (the controller's `list()` method was renamed to `listAvatars` so the hook keeps the chunk-13 README's expected name). Selecting a tile fires `useUpdateMyAvatarMutation()` against the new `PUT /api/interactive-sessions/{roomCode}/me/avatar` endpoint — backend `InteractiveSessionService.updatePlayerAvatar` rejects unknown keys with 400, broadcasts `/topic/.../lobby` on success, and only accepts changes while the session is in LOBBY status.
- [x] Streak indicator in player view — `PlayPage.tsx` mounts a "{N}x streak 🔥" hero banner above the QuestionCard when the local player's `currentStreak ≥ 2`; `ScoreBoard.tsx` also renders a small streak chip inline for every visible player on the leaderboard.
- [x] Host autoAdvance countdown ring — `PlayPage.tsx` renders a conic-gradient ring in the host sidebar while `game.roundResult` is set and the session has `answerSubmissionMode = TURN_BASED + autoAdvance = true`. The ring counts down from `settings.podiumDuration` in lock-step with the server's scheduled `startNextRound`.
- [x] Per-player accuracy + streak in placement card — `GameOver.tsx` now renders a `PlacementChips` row under every podium tile and rest row showing accuracy %, longest streak, speed bonus total, and reactions sent. Backend `PlayerPlacement` gained `speedBonusTotal` (snapshotted off `InteractiveSessionPlayer.speedBonusTotal` in `endGame`); the rest were already on the model.
- [x] Frontend codegen + lint — `BrainFlexApi.ts` regenerated; `npm run lint` + `tsgo --noEmit` clean
- [x] Backend tests pass — 286 tests green; chunk 13 adds `AvatarServiceTest` + 7 `InteractiveSessionServiceTest` cases (customRoomCode happy + collision, timing+streak capture, wrong-answer streak reset, valid + unknown avatarKey, requireFullName+guest)

## Cross-cutting backend changes (not in the original scope but added by this chunk)

- `InteractiveSession.hostName` + `hostAvatarUrl` denormalized in `createInteractiveSession` so the lobby header doesn't need a `UserRepository` round trip on every refresh.
- `InteractiveSession.allowReJoin` + `InteractiveSession.lobbyOpenedAt` defaults populated at create time.
- `InteractiveSessionDTO` + `InteractiveSessionPlayerDTO` now expose the new player chrome stats (avatar, colorTag, currentStreak, longestStreak, accuracy, reactionsSent, speedBonusTotal, lateJoin, disconnected, lastSeenAt) so the frontend can render them without a separate fetch. (`avatar` was originally a bare `avatarKey` — see the avatar-unification follow-up below.)
- `InteractiveSessionRepository.findByStatusAndPlayersUserId` added so `PresenceService` can flip the per-interactive-session `disconnected` flag without a full collection scan.
- Chunk 11's `acceptReaction` now increments `InteractiveSessionPlayer.reactionsSent` (the counter existed in the DTO surface but was never written — the field is wired here so chunk 13's placement-card UI has real data when it lands).

## Follow-up — avatar unification & deferred preset assets

> **Update (removed).** The preset roster (`AvatarService`, `GET /api/avatars`), the lobby avatar picker (`PUT /me/avatar`, `useListAvatarsQuery`/`useUpdateMyAvatarMutation`), and the entire Gen-1 game flow (lobby/play/results) have since been **removed** — the preset images were never served and the picker lived only in the throwaway Gen-1 lobby. The `Avatar` value object below is retained as a LINK-only seam (KEY is dormant until a picker is rebuilt); player-join now routes to the Gen-2 `/sessions/$sessionId`. See [migrations-needed.md](../../../to-do/migrations-needed.md). The record below is left as-built.

- **Unified avatar value object (landed).** The standalone `InteractiveSessionPlayer.avatarKey` was replaced by `Avatar avatar` (`{ avatarType: KEY | LINK, avatarUrl, avatarKey }`, in `model/shared/` + `model/enums/AvatarType`). A player is LINK by default (their real `pictureUrl`, materialized at the DTO boundary by `InteractiveSessionPlayerResponse.resolveAvatar`) and flips to KEY when they pick a preset. Consumers now read one field instead of branching preset-vs-`pictureUrl`. The canonical Gen-2 `SessionPlayerList/PlayerListItem.tsx` renders it via the shared `<Avatar>` + the `resolvePlayerAvatarSrc` helper in `frontend/src/utils/avatarUrl.ts`. No data migration — see [migrations-needed.md](../migrations-needed.md).
- **TODO — serve preset images.** `AvatarService`'s 16 presets advertise `imageUrl` values under `/assets/images/avatars/*.svg` that **do not exist** — those URLs 404 today, so KEY avatars currently degrade to the player's initial via `<Avatar>`'s `onError`. Serve the preset images from S3/Garage (and/or wire the orphaned mascot library under `frontend/src/assets/images/mascots/`) so KEY avatars render. When that lands, `resolvePlayerAvatarSrc` (in `frontend/src/utils/avatarUrl.ts`) lights up with no change (it already resolves KEY against the live preset list). This is the asset half tracked against the chunk-19 media library — see [19-media-asset](../19-media-asset/README.md).
