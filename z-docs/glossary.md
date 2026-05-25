# Glossary

Domain terms used throughout BrainFlex. Add new entries here when you introduce a concept that isn't self-evident from the name.

| Term | Meaning |
| ---- | ------- |
| **Deck** | A collection of `DeckElement`s (slides + questions) authored together. Plays as a sequence in an InteractiveSession. Persisted in the `decks` MongoDB collection. |
| **Element** | A single item in a deck: a `Slide` or a `Question`. Sealed Java hierarchy under `model/element/`; embedded in the parent `Deck` document. |
| **Element kind** | The polymorphic discriminator for `DeckElement` (`SLIDE`, `MCQ`, `TEXT`, `NUMBER`, `IMAGE_CHOICE`, `RANKING`, `SCALES`, `Q_AND_A`, `GRID`, `PLACE_ON_IMAGE`). |
| **Slide** | A `DeckElement` with no scoring — title/section/callout/content/end variants. Used for presentation framing inside a deck. |
| **Question** | A scoreable `DeckElement` (sealed sub-interface). Each kind carries its own correctness shape and accepts a typed `AnswerPayload`. |
| **MCQ** | Multiple-choice question with `List<McqOption> options` and `correctOptionIds: List<String>` (multi-correct). Empty `correctOptionIds` is allowed but marks the slide unscoreable. |
| **AnswerPayload** | Sealed interface for typed player answers (`McqAnswer`, `TextAnswer`, `NumberAnswer`, …, `TimeoutAnswer`). Players submit one per round. |
| **InteractiveSession** | A live, hosted play session of a Deck. Snapshots the deck's elements at create time so author edits mid-game don't desync clients. Tracks players, scores, and current phase. |
| **InteractiveSession phase** | `SUBMIT` → `VOTE` → `REVEAL`. Only Best-Answer-mode questions enter `VOTE`. |
| **SessionFormat** | Chrome flavor for a live session: `GAME` (persistent leaderboard, podium, `GameOver` placement) or `PRESENTATION` (no leaderboard, aggregated end-of-session summary). Author default on `Deck.defaultSessionFormat`; frozen on `InteractiveSession.format` at create time. Independent of `scoringEnabled`. |
| **AnswerSubmissionMode** | How players answer within a session: `SIMULTANEOUS` (everyone at once) or `TURN_BASED` (host advances). Renamed from `InteractiveSessionMode` / settings `mode` in chunk 24. |
| **ShowResponses cascade** | Runtime cascade `element → deck → session → per-format default`. Each level may be `INHERIT` (defer up). Per-format defaults: `GAME` → `INSTANT`, `PRESENTATION` → `ON_CLICK`. |
| **Organization** | A user-created group. Themes and decks can be scoped to an org (visible to all members). Users may belong to multiple orgs via `User.organizationIds`. |
| **Theme** | Per-user (or per-org) palette: `huePrimary`, `hueAccent`, light/dark/system mode, optional background + logo. Lives in `themes` collection. |
| **Galaxy/Best Answer mode** | Question flag (`bestAnswerMode = true`) that adds a voting phase after submission. Points awarded via a `BestAnswerScoringStrategy` (default `POINTS_PER_VOTE`: each player whose submission got ≥1 vote earns `votesReceived × bestAnswerPoints`; legacy `FLAT_WINNER` matches the pre-chunk-24 behavior). |
| **Pulse mode** | _Retired in chunk 24._ Folded into `SessionFormat.PRESENTATION` + `scoringEnabled = false`; legacy `DeckPreset.PULSE` documents migrate transparently on read. |
| **Garage** | Self-hosted S3-compatible object store running in Docker Compose. Backs all image uploads (avatars, theme logos/backgrounds, gallery images). |
| **Auto-memory** | Persistent agent state under `memory/` (not project docs). Excluded from `doc-lint`. |
