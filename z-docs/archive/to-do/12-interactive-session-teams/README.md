# 12 — InteractiveSession teams

**Status:** Complete (2026-05-21). Backend + codegen landed 2026-05-19; the lobby team picker grid, in-game team leaderboard, team podium, host move-player select, and STOMP `/teams` subscription are all wired through `Lobby` → `TeamPicker`, `PlayPage` → `ScoreBoard` + `TeamLeaderboard`, `ResultsPage` → `GameOver` → `TeamPodium`, and `useInteractiveSessionWebSocket`. Drag-and-drop moves are intentionally not pursued — the per-row "Move to…" select on each member is the host's path for cross-team reassignment.
**Depends on:** Nothing strict; pairs with chunk 13 (settings flag `teamMode`)
**Unblocks:** 13 (`InteractiveSessionPlayer.teamId`)

## Scope

Team mode — Kahoot's signature classroom feature. Players join a team in the lobby; team score is the sum of member scores; leaderboards and reveals show team rankings instead of (or alongside) individual rankings.

Teams are embedded in the InteractiveSession document — they don't outlive the game.

## New embedded model

```text
Team (embedded in InteractiveSession.teams)
  String id                            // server-assigned UUID
  String name                          // host-set or auto-generated (e.g. "Red Lions")
  String color                         // oklch token name (red | orange | yellow | green | teal | blue | violet | pink)
  String captainUserId                 // nullable; defaults to first joiner
  int score                            // sum of member.score; recompute on each PlayerAnswer write
  int memberCount                      // denorm; convenience for lobby UI
```

## Updates to existing models

- **InteractiveSession**
  - `boolean teamMode` — default `false`
  - `List<Team> teams` — empty unless `teamMode`
  - `boolean autoBalanceTeams` — distributes new joiners round-robin
- **InteractiveSessionSettings**
  - `boolean teamMode` — default `false` (host configures at create time, copied to InteractiveSession)
  - `int teamCount` — default `2` for new shows in team mode; ignored when manual teams are pre-defined
- **InteractiveSessionPlayer** (covered also in chunk 13)
  - `String teamId` — nullable when not in team mode

## Backend changes

- `InteractiveSessionService.createInteractiveSession` — if `settings.teamMode`, generate `teamCount` default teams with sequential names + color tokens
- `InteractiveSessionService.joinInteractiveSession` — if `teamMode`:
  - If `autoBalanceTeams=true`, pick the smallest team
  - Else require `teamId` in the join payload; reject if missing
- `InteractiveSessionService.leaveInteractiveSession` — decrement `team.memberCount`; if captain leaves, reassign or clear
- `InteractiveSessionService.recordAnswer` — after writing `PlayerAnswer`, recompute `team.score = sum(member.score)`. Use a Mongo aggregation or maintain incrementally.
- New endpoints:
  - `POST /api/interactive-sessions/{roomCode}/teams` — host creates a custom team; body `{ name, color }`
  - `PUT  /api/interactive-sessions/{roomCode}/teams/{teamId}` — rename/recolor
  - `DELETE /api/interactive-sessions/{roomCode}/teams/{teamId}` — host only; players reassigned to other teams round-robin
  - `PUT  /api/interactive-sessions/{roomCode}/players/{userId}/team` — host moves a player; body `{ teamId }`
- WebSocket — emit `TeamUpdateMessage` over `/topic/interactive-session/{roomCode}` whenever team membership or score changes

## Frontend changes

- Lobby:
  - Team picker grid (each team is a card with color, name, current member list)
  - "Auto-assign" button if `autoBalanceTeams`
  - Host can add/rename/delete teams
- Player view during play:
  - Team badge under the player's score
  - Team leaderboard alternates with individual leaderboard between rounds
- Host view:
  - Team leaderboard during reveals
  - Per-team progress indicator during SUBMIT phase
- Results / podium:
  - Top 3 teams on the podium; individual MVP from each team shown underneath

## Cross-cutting concerns

- Don't pre-create a `Team` collection — keeping teams embedded means `InteractiveSessionResult` doesn't need a separate FK and the team disappears with the game (as it should)
- `PlayerPlacement` (chunk 13 additions) gets `teamId` so the post-game results page can re-render team standings
- Team scoring runs alongside individual scoring; both `team.score` and `player.score` are authoritative

## Checklist

- [x] `Team` embedded record + `InteractiveSession.teams` + `InteractiveSession.teamMode` + `autoBalanceTeams`
- [x] `InteractiveSessionSettings.teamMode`, `teamCount`, `autoBalanceTeams`
- [x] `InteractiveSessionPlayer.teamId` + `PlayerPlacement.teamId` (for the post-game team standings render in chunk 13)
- [x] `createInteractiveSession` seeds default teams when team mode and auto-assigns the host
- [x] `joinInteractiveSession` auto-balance or require teamId (manual mode); `JoinInteractiveSessionRequest` body
- [x] `submitAnswer` + Best-Answer reveal recompute `team.score`; broadcasts `TeamUpdateMessage`
- [x] Host team CRUD endpoints (`POST/PUT/DELETE /api/interactive-sessions/{code}/teams`, `PUT /players/{userId}/team`) + tests
- [x] STOMP `TeamUpdateMessage` broadcasts on `/topic/interactive-session/{roomCode}/teams`
- [x] Lobby team picker grid (`TeamPicker` rendered from `Lobby` when `teamMode`)
- [x] Team leaderboard alongside individual leaderboard during play (`TeamLeaderboard` in the `PlayPage` sidebar; ScoreBoard renders a per-row team chip)
- [x] Team podium on results (`TeamPodium` rendered above the individual podium in `GameOver`)
- [x] Host move-player affordance — per-member native `<select>` on each `TeamCard` calls `useMovePlayerToTeamMutation`
- [x] STOMP `/teams` subscription in `useInteractiveSessionWebSocket` dispatches `teamUpdateReceived` so scores tick live
- [x] Frontend codegen + lint
- [x] Backend tests pass (258/258, including 11 new team-mode tests)
