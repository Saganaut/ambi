# 24 — Session format & runtime cascades

**Status:** Complete (2026-05-20). Backend ships the renamed enums, the runtime
cascade, the strategy registry, the new STOMP host actions, the host-overlay
DTO fields, and covering tests (440 green). Frontend has the format picker on
CreateGamePage, RoundDataView (PRESENTATION round-end), SessionSummary
(PRESENTATION end-of-session), host Reveal/Freeze controls in the PlayPage
sidebar, a Behavior section in the deck editor that promotes `showResponses`
to every interactive kind, and a Session-defaults block in ThemePanel for
`defaultSessionFormat` + `defaultShowResponses`. apiEnhancements seeds the
`getInteractiveSession` cache from the create response so the lobby's first
render already knows `format`. `BrainFlexApi.ts` has been regenerated
backend-up, dropping the hand-patched `"INHERIT" | "INHERIT"` artifact, and
the slice's `setSession` now hydrates `revealedElementIds` + `frozenElementIds`
from the DTO so host reconnects preserve reveal/freeze state. Type-check + 48
frontend tests + 440 backend tests green; the only remaining lint errors are
pre-existing (LoginModal, CommonOptionsSection, ThemePanel `_e`). Docs (games
README §0/§4/§5/§6/§10 + new Cascades subsection + glossary) refreshed.

Deferred follow-ups:
- `DesignEditor` (per chunk 21) — still tracked under chunk 21.
**Depends on:** nothing structural — touches `Deck`, `InteractiveSession`, `InteractiveSessionSettings`, every `DeckElement`, and the round-result + game-over UI.
**Unblocks:** future "game board" GAME sub-variant; consistent precedence pattern for any later behavior knob (scoring opt-out, response freeze defaults, etc.).

## Scope

Turn the "what kind of session is this" question into a real, runtime-authoritative concept and write down the precedence rules that govern every related behavior knob.

Three threads land together because they're tangled:

1. **`SessionFormat`** (renamed from `DeckPreset`) becomes the chrome/shell selector for a live session: `GAME` or `PRESENTATION`. Lives on the deck as the *default* and on the session as the *actual*; session always overrides.
2. **Behavior cascades** — session > deck > element — for every runtime knob the host might want to flip without touching the authored content. Show-responses is the first concrete one; the same shape applies to anything else we add later.
3. **Best-answer scoring becomes pluggable** so "points per vote" (the new default) and "flat winner takes all" (current behavior) are interchangeable strategies, not a single hard-coded rule.

`scoringEnabled` deliberately stays **independent** of `SessionFormat` — a PRESENTATION can still award points on a couple of quiz interludes; a GAME can include unscored Q&A breaks.

## Concepts

### `SessionFormat` is chrome, not a constraint

- **`GAME`** — persistent leaderboard, score animations, podium at round end, `GameOver` placement screen at session end. The surface where game-board sub-variants eventually live.
- **`PRESENTATION`** — no persistent leaderboard, round-end focuses on aggregated data (charts, distributions, word clouds), `SessionSummary` screen at the end aggregates all responses across all questions.

**Every element kind is permitted in both formats.** The format controls which UI shell renders the chrome — not which questions you can include or which behaviors are available. Best-answer voting, timers, freeze-responses, reveal-on-demand, scoring, all work identically in both.

`PULSE` is dropped: anything that was Pulse-shaped is now `PRESENTATION` with `scoringEnabled = false`. Templates take care of pre-filling that combo so users don't have to think about it.

### Cascades — two opposite directions

| Cascade | Direction | Reason | Examples |
|---|---|---|---|
| **Authored content** | element > deck > theme > placeholder | most-specific authored value wins; the host doesn't override what the author set | `background`, `image`, `themeId`, media |
| **Runtime behavior** | session > deck > element | host's choice at run time wins; deck is the suggestion; element is the per-question knob | `format`, `showResponses`, future per-element scoring opt-out and response-freeze defaults |

**Documented odd-one-out:** `DeckElement.displaySeconds` is an *authored* value but unconditionally overrides `InteractiveSessionSettings.timePerQuestion`. The reasoning ("the author knows this specific question needs 60s") stays; flag it explicitly in the docs so the exception isn't surprising.

### Best-answer scoring is pluggable

Instead of one hard-coded "flat bonus to the winner," dispatch to a strategy and pass the full vote tally + submission list. Two strategies ship day one; more can be added without touching `InteractiveSessionService`.

## Model changes

### Enum rename

- `DeckPreset` → `SessionFormat`. Remove `PULSE`. Values: `GAME`, `PRESENTATION`.
- Move the file from `model/enums/DeckPreset.java` to `model/enums/SessionFormat.java`. Keep `DeckPreset` as a deprecated `@JsonAlias`-style shim for one release so existing Mongo documents that wrote `recommendedPreset: "PULSE"` deserialize cleanly (migrate `PULSE` → `PRESENTATION` on read; back-fill on next save).

### `Deck`

- `recommendedPreset: DeckPreset` → `defaultSessionFormat: SessionFormat` (default `GAME`).
- No new fields beyond the rename and a `defaultShowResponses: ShowResponsesMode` (default `INHERIT`) for the new cascade.

### `InteractiveSession`

- New: `format: SessionFormat` — authoritative for the run. Set at create time from `CreateInteractiveSessionRequest.format` if provided, else from `deck.defaultSessionFormat`. Never read off the deck again after creation; this is the same "freeze at start" rule already applied to `deckSnapshot`.

### `InteractiveSessionSettings`

- **Rename** `mode: InteractiveSessionMode` → `answerSubmissionMode: AnswerSubmissionMode`. Rename the enum class too (`InteractiveSessionMode` → `AnswerSubmissionMode`) — same `SIMULTANEOUS | TURN_BASED` values.
- New: `showResponses: ShowResponsesMode` (default `INHERIT`). Top of the runtime cascade.
- `scoringEnabled` stays untouched and stays independent of `format`.

### `DeckElement` interface + every record

- Existing per-`Slide` `showResponses` field is promoted to a shared `DeckElement` field with default `INHERIT`. Bottom of the runtime cascade.
- New: `bestAnswerScoring: BestAnswerScoring` (default `POINTS_PER_VOTE`) on every element that already declares `bestAnswerMode`.
- **Rename** `bestAnswerBonus` → `bestAnswerPoints`, default **`50`** (was `0`). The int no longer means "flat bonus" — the strategy decides what it means (per-vote multiplier, flat amount, decay weight, etc.). The non-zero default means flipping `bestAnswerMode = true` results in meaningful scoring without the author having to remember to fill in a points field; 50 is half the typical `pointValue` of 100, so a popular submission with two votes roughly matches the value of getting the question right.

### `ShowResponsesMode`

Add `INHERIT` to the existing enum:

```
INHERIT   — defer to the next level up the cascade. Default everywhere.
INSTANT   — stream responses live as players submit.
ON_CLICK  — host explicitly reveals.
PRIVATE   — never shown on the host display (post-game review only).
```

Resolution order at runtime: element value if not `INHERIT` → else deck value if not `INHERIT` → else session value → else implicit per-format default:

- `GAME` → `INSTANT`. Reveal fires automatically when the round closes (timer expires OR every player has submitted, whichever comes first). The host can still override on a per-element basis or via the reveal-on-demand control.
- `PRESENTATION` → `ON_CLICK`. Host paces the data reveal manually — matches the Mentimeter "click to show responses" feel. Reveal-on-demand is the primary control in this format.

### `BestAnswerScoring` (new enum)

```
POINTS_PER_VOTE  — default. Every player whose submission got ≥1 vote earns
                   `votesReceived × bestAnswerPoints`. Ties handled naturally
                   (each tied player keeps their per-vote total).
FLAT_WINNER      — legacy behavior. The submission(s) with the most votes
                   each earn `bestAnswerPoints`. Ties → all tied players get
                   the bonus.
```

## Service changes

### `BestAnswerScoringStrategy` (new interface)

```java
public interface BestAnswerScoringStrategy {
    /**
     * @param submissions  all submissions for this round, keyed by submissionId
     * @param votes        every vote cast this round
     * @param configuredPoints  the element's `bestAnswerPoints` value
     * @return map of userId → points to award (entries with 0 may be omitted)
     */
    Map<String, Integer> award(
        Map<String, PlayerAnswer> submissions,
        List<RoundVote> votes,
        int configuredPoints
    );
}
```

Two implementations: `PointsPerVoteStrategy`, `FlatWinnerStrategy`. Selected by `element.bestAnswerScoring()` via a small lookup map injected into `InteractiveSessionService`. `completeVotePhase` calls the resolved strategy and merges the returned map into `InteractiveSessionPlayer.score` (and `speedBonusTotal` if we later split best-answer points out for the placement card).

This lets a future "decay" strategy (1st place 3pts, 2nd 2pts, 3rd 1pt) drop in without changing service code or the wire protocol.

### `ShowResponsesResolver` (new helper)

Tiny: `ShowResponsesMode resolve(InteractiveSession session, Deck deck, DeckElement element)` walks element → deck → session and falls back to the format default. Used by:

- `InteractiveSessionService.completeRound` to decide whether to broadcast the response distribution on `RoundResultMessage`.
- The new host "reveal now" action (see below) when `ON_CLICK` is the resolved value.
- The post-game review (`PRIVATE` is the only value that hides results in the host display even after the round ends).

### `InteractiveSessionService` runtime branching

The format dictates the chrome, which dictates which messages are sent and which UI components mount. Concretely:

- `RoundResultMessage` gains a `format: SessionFormat` field so the client renders the right shell without an extra lookup.
- `GAME` keeps emitting `InteractiveSessionEndedMessage` with placements as today.
- `PRESENTATION` emits a new `SessionSummaryMessage` instead — never both. Cleaner per-shell handling on the client (one message → one renderer) at the cost of one extra STOMP subscription. The client subscribes to both topics; only the one matching `session.format` ever fires.

### New host actions

- **Reveal now** — STOMP `/app/interactive-session/{code}/reveal { elementId }`. Flips a per-round flag and broadcasts the response distribution that `completeRound` would have sent. No-op when the resolved `showResponses` is not `ON_CLICK`. Idempotent.
- **Freeze responses** — STOMP `/app/interactive-session/{code}/freeze { elementId, mode }` where `mode` is `ACCEPTING_RESPONSES | NOT_ACCEPTING_RESPONSES`. Flips the element's `responseMode` for the current round only (doesn't mutate the deck). Submissions arriving while frozen are 409-rejected; the player UI shows "answers closed."

## Frontend changes

### Create flow

- "Create" surface picks `SessionFormat` first (two big tiles: GAME, PRESENTATION). Deck's `defaultSessionFormat` pre-selects but doesn't lock.
- Advanced settings expose the new fields:
  - `showResponses` (with the inherited value shown as ghost text)
  - rename `mode` → `answerSubmissionMode` everywhere
- Templates (existing concept) start carrying a `(format, settings)` pair so "Trivia Night" pre-fills GAME + scoring + timer; "All-Hands Polls" pre-fills PRESENTATION + scoring-off + no-timer.

### Play surface

- `PlayPage` and `ScoreBoard` render different chrome based on `session.format`. GAME keeps the persistent leaderboard; PRESENTATION swaps it for a host data panel.
- `RoundResult` already exists for GAME; add a `RoundDataView` for PRESENTATION that uses the same `ResultsDisplayType` renderers already powering the post-game review.
- New host controls in the dashboard: "Reveal results" (only enabled when the resolved `showResponses` is `ON_CLICK` and the round is in SUBMIT), "Freeze answers" toggle.

### End screens

- GAME → existing `GameOver.tsx`.
- PRESENTATION → new `SessionSummary.tsx`. Aggregated chart per question (re-uses the post-game `ReviewPanel` renderers); no rankings; "Export" button when `scoringEnabled` was on for at least one element.

### Editor

- Deck editor swaps `recommendedPreset` for `defaultSessionFormat` in the deck-settings panel.
- New "Default show responses" dropdown on the deck-settings panel.
- Existing per-`Slide` `showResponses` dropdown moves to the shared "Behavior" panel so every element exposes it.

## Backend tests

- Unit: `PointsPerVoteStrategy` and `FlatWinnerStrategy` over the same fixtures (single-winner, tie, no-votes-cast, single-voter, every-player-gets-one).
- Unit: `ShowResponsesResolver` matrix — every combination of `INHERIT` / explicit at session/deck/element + both format defaults.
- Service: `InteractiveSessionService.createInteractiveSession` honors `request.format`, falls back to `deck.defaultSessionFormat`, then to `GAME`.
- Service: `RoundResultMessage.format` round-trips; PRESENTATION end flow broadcasts `SessionSummaryMessage`.
- Service: `revealNow` is no-op when resolved show-responses is not `ON_CLICK`; idempotent on repeat call.
- Service: `freezeResponses` rejects late submissions with 409.
- Migration: a deck document persisted with `recommendedPreset: "PULSE"` deserializes as `defaultSessionFormat: PRESENTATION` and the next save back-fills the rename.

## Frontend tests

- `useGameWebSocket` routes `SessionSummaryMessage` into the right slice.
- `CreateGamePage` pre-fills the format from the selected deck and lets the host override.
- `ShowResponsesResolver` (frontend mirror) matches the backend resolution for the in-editor preview.

## Migration

1. Add `SessionFormat` enum with `JsonAlias("PULSE") → PRESENTATION` deserialization.
2. Add the new fields with backward-compatible defaults (`INHERIT` everywhere; `POINTS_PER_VOTE` as default strategy).
3. Rename in code: `recommendedPreset` → `defaultSessionFormat`, `mode` → `answerSubmissionMode`, `bestAnswerBonus` → `bestAnswerPoints`. Mongo `@Field` aliases keep existing documents readable; first write per document migrates the field name.
4. Drop `DeckPreset` once a Mongo `updateMany` confirms zero `recommendedPreset` references remain in the live collection.
5. Regenerate `BrainFlexApi.ts`; add `apiEnhancements` cache-sync for the new mutations (`revealNow`, `freezeResponses`).

## Out of scope

- **Game boards.** The point of carving out a real `SessionFormat.GAME` is precisely to leave room for this; the actual board renderer, turn-pawn state, dice/spinner, etc. are a separate future chunk.
- **Per-element scoring opt-out (`scoringEnabledOverride`).** Mentioned in the games README §11 as a planned addition; uses the same cascade shape and should land in a follow-up chunk so this one stays focused.
- **Template authoring UI.** Templates pre-filling (format + settings) is the goal; the actual "save my current settings as a template" surface is its own work.
- **Wire-protocol versioning.** `RoundResultMessage` gains one new field; adding it is non-breaking. If the protocol grows more during implementation we'll revisit.

## Checklist

### Backend

- [x] Add `SessionFormat` enum; legacy `PULSE` → `PRESENTATION` via a Mongo `ReadingConverter` + Jackson `@JsonCreator`
- [x] `Deck.recommendedPreset` → `Deck.defaultSessionFormat`; Mongo `@Field("recommendedPreset")` keeps stored docs readable; Jackson `@JsonAlias({"recommendedPreset"})` for in-flight clients
- [x] `InteractiveSession.format` (frozen at create time)
- [x] `CreateInteractiveSessionRequest.format` honors override → falls back to deck
- [x] `InteractiveSessionMode` → `AnswerSubmissionMode`; settings field renamed (`mode` → `answerSubmissionMode`)
- [x] `ShowResponsesMode.INHERIT` added; promoted from `Slide` to `DeckElement` interface
- [x] `Deck.defaultShowResponses`; `InteractiveSessionSettings.showResponses`
- [x] `ShowResponsesResolver` + matrix tests
- [x] `BestAnswerScoring` enum; rename `bestAnswerBonus` → `bestAnswerPoints` across all 12 question records (Mongo `@Field("bestAnswerBonus")` preserves storage)
- [x] `BestAnswerScoringStrategy` interface + `PointsPerVoteStrategy` + `FlatWinnerStrategy` + `BestAnswerScoringRegistry`; covering tests
- [x] Strategy dispatch wired into `InteractiveSessionService.completeVotePhase`
- [x] `RoundResultMessage.format` field
- [x] `SessionSummaryMessage` for PRESENTATION end (GAME keeps `InteractiveSessionEndedMessage`; never both)
- [x] Host actions: `revealNow`, `freezeResponses` STOMP endpoints + service methods; `ResponsesRevealedMessage` broadcast; submit-answer returns 409 when frozen
- [x] `DeckElementCloner`, `ElementRedactor`, `DeckImageMapper`, `ElementShuffler` updated for renamed fields + new `bestAnswerScoring`
- [x] Service + controller + DTO test sweep (440 tests, 17 new)

### Frontend

- [x] `BrainFlexApi.ts` regenerated backend-up via `npx @rtk-query/codegen-openapi openapi-config.cts`; replaces the hand-patched chunk-24 fields with the live schema (drops the `"INHERIT" | "INHERIT"` artifact and picks up `revealedElementIds` / `elementResponseModeOverrides` + drift-fixes for notifications/achievements/analytics CSV)
- [x] CreateGamePage / PlayPage call-site renames (`settings.mode` → `settings.answerSubmissionMode`)
- [x] Deck-card defaults updated (`recommendedPreset` → `defaultSessionFormat`)
- [x] `apiEnhancements` cache-sync — `createInteractiveSession` now seeds the `getInteractiveSession` cache from the response. `revealNow` / `freezeResponses` are STOMP-only and don't need apiEnhancements; the slice handles their broadcasts.
- [x] CreateGamePage: format picker (two big tiles) + deck-driven pre-fill + `showResponses` dropdown
- [x] PlayPage / ScoreBoard: branch on `session.format` for chrome (GAME persistent leaderboard vs PRESENTATION host data panel)
- [x] `RoundDataView` (PRESENTATION round-end)
- [x] `SessionSummary` (PRESENTATION end screen)
- [x] Host dashboard: "Reveal results" + "Freeze answers" controls (`HostRoundControls` in PlayPage sidebar)
- [x] Deck editor: `defaultSessionFormat` + `defaultShowResponses` panel (Session-defaults section in ThemePanel); promoted `showResponses` to shared `BehaviorSection` mounted by EditSlidePanel
- [x] `ShowResponsesResolver` (frontend mirror at `frontend/src/utils/showResponsesResolver.ts`)
- [x] Register new components in `DesignSystemPage` (RoundDataView + SessionSummary accordion entries)

### Docs

- [x] Rewrite [`features/games/README.md`](../../features/games/README.md) §0, §4, §5, §6, §10 to reflect the new model
- [x] Add a "Cascades" subsection to [`features/games/README.md`](../../features/games/README.md) documenting both directions side-by-side (plus a pluggable best-answer scoring block)
- [x] Update [`glossary.md`](../../glossary.md): `SessionFormat`, `AnswerSubmissionMode`, ShowResponses cascade, pluggable best-answer scoring, retire `DeckPreset` / `PULSE`
- [x] `features/games/session-runtime-notes.md` was never created in the repo; nothing to delete.
