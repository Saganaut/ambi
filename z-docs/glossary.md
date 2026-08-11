# Glossary

Domain terms used throughout Ambi. Add an entry when you introduce a concept that isn't self-evident from the name.

**Rule:** an entry is one or two sentences plus a link. If it needs a paragraph, it belongs in a feature doc or an ADR — write it there and link it from here.

## Authoring

| Term | Meaning |
| ---- | ------- |
| **Deck** | A collection of slides authored together. Plays as a sequence in a LiveSession. |
| **Slide** | One item in a deck: a title, a typed `content` payload, optional settings overrides, and a server-owned ordering key. |
| **SlideType** | The polymorphic discriminator for a slide's `content` (`@JsonSubTypes`, 17 values): `TITLE`, `CONTENT`, `MEDIA`, `INSTRUCTION`, `MCQ`, `TEXT`, `NUMBER`, `RANKING`, `SCALES`, `AXIS`, `GRID`, `MATCHING`, `ALLOCATION`, `PLACE_ON_IMAGE`, `DRAWING`, `Q_AND_A`, `FOLLOW_UP`. See `presentation/slide/enums/SlideType.java`. |
| **ScorableContent / NonScorableContent** | The sealed split over `SlideContent`. 12 kinds are graded; `TITLE`, `CONTENT`, `MEDIA`, `INSTRUCTION` and `Q_AND_A` are not. Only a scorable slide opens a graded round. |
| **Lexorank** | The scheme behind `Slide.sortOrder` — a string key that sorts lexicographically, so a reorder rewrites one slide instead of renumbering the deck. `SlideRankService` wraps lexorank4j. |
| **PointSettings / AnswerSettings / AudienceSettings** | The three settings records in `presentation/deck/Settings.java` — scoring bonuses, per-round behaviour (including `countdownTime`), and room rules. Each resolves hardcoded default → deck default → per-slide override. |
| **Theme** | A named 16-role colour palette plus a light/dark appearance, optional background and logo. A per-user global theme paints the app; a deck theme supersedes it on the editor canvas. "Ambi Light"/"Ambi Dark" come from `tokens.css` and are never DB rows. |
| **Organization** | A user-created group. Decks, themes and galleries can be org-scoped; users may belong to several. |

## Slide kinds worth naming

| Term | Meaning |
| ---- | ------- |
| **MCQ** | Multiple choice, multi-correct: any non-empty subset of the options can be the key. An empty key is allowed but leaves the slide unscoreable. |
| **AXIS** | Free-form 2D placement on a labelled X × Y plane, graded all-or-nothing by distance to author-set targets within a per-slide tolerance (`INSIDE_RADIUS`). See [axis slides](features/axis-slides/README.md). |
| **PLACE_ON_IMAGE** | Axis's sibling over a backing image: one pin per authored item, same `INSIDE_RADIUS` grading. Implemented end to end. See [place-on-image slides](features/place-on-image/README.md). |
| **DRAWING** | Freehand drawing on a shared 1:1 canvas, submitted as a PNG in S3. Always grades `correct = false`. See [drawing slides](features/drawing-slide/README.md). |
| **Follow-up slide** | A slide chained off a parent scorable slide (`parentId`/`childId`, server-owned) that builds its question from the parent round's submissions. Sits immediately after its parent; one per slide, no chains. See [follow-up slides](features/follow-up-slides/README.md). |
| **FollowUpMode** | What a follow-up asks about its parent: `PREDICT_POPULAR`, `BEST_ANSWER_VOTE`, or `SPOT_THE_ANSWER` (the only scoring mode). Each declares its valid parent types and whether it needs an answer key. See [follow-up slides](features/follow-up-slides/README.md). |

## Live session

| Term | Meaning |
| ---- | ------- |
| **LiveSession** | A hosted run of a deck. Snapshots the deck at create time so author edits mid-game can't desync clients; tracks participants, scores and the current phase. |
| **roomCode** | The short, human-typeable code an audience enters to join. Unique-indexed on the session. |
| **publicId** | The session's random public handle — unique-indexed, used in join links and in the STOMP topic `/topic/liveSession/{publicId}`, so the internal id never reaches a client. |
| **Participant** | One player in one session: a Mongo document per (session, user), never reused. Play-time records reference `participantId`; `userId` stays on the document but is stripped on the wire. |
| **Presence** | A participant's volatile connection state (status + `lastSeenAt`), held in the Redis `PresenceStore` rather than written to the participant document on every heartbeat. |
| **Round** | One slide's play-through. There is no `Round` entity: the live control record is `LiveRoundState` in Redis, and the durable outcome is a `RoundResult` in Mongo. |
| **RoundPhase** | `SUBMIT` → (`SUBMIT_LIVE`) → `LOCKED`/`REVEAL_RESPONSES` → `REVEAL_RESULTS`. A voting round branches instead: `SUBMIT`/`SUBMIT_LIVE` → `VOTE` → `REVEAL_RESULTS`, which is `VOTE`'s only exit. `VOTE` is the *current* round's own best-answer/deception voting — distinct from Best Answer mode below. |
| **Round timer / deadline** | A round's auto-close instant, `roundStartedAt + durationMs + accumulatedPauseMs`, set only when the resolved `countdownTime` is positive. A leader-elected scheduler drains a Redis ZSET and fires the same close a host click does. See [ADR 002](decisions/002-live-session-round-timers.md). |
| **Best Answer mode** | `FollowUpMode.BEST_ANSWER_VOTE`: a follow-up round where participants pick the best submission from the parent round. Runs as an ordinary round and never enters `RoundPhase.VOTE`. |
| **Board** | The shared host/projector screen (`SessionBoard`), which renders the open round per content type. Every interactive slide kind has a dedicated view. |
| **Tally** | The running per-option submission count for a live round — a Redis hash bumped with `HINCRBY`, deliberately outside the `LiveRoundState` snapshot so submits stay lock-free. |

## Data

| Term | Meaning |
| ---- | ------- |
| **AnswerPayload** | The typed player answer — one `Answer` document per participant per round. Variants pair 1:1 with slide kinds, except Q&A, whose per-question wire shape appends into one stored aggregate. |
| **RoundResult** | The durable projection of a closed round: per-participant outcomes, response times, the correct option, and a per-choice tally stored as a list (choice strings can contain dots, which Mongo forbids in map keys). |

## Infrastructure

| Term | Meaning |
| ---- | ------- |
| **Garage** | Self-hosted S3-compatible object store in Docker Compose. Backs all image uploads — avatars, theme logos and backgrounds, gallery images, drawing submissions. |
| **Auto-memory** | Persistent agent state under `memory/`, not project docs. Excluded from `doc-lint`. |
