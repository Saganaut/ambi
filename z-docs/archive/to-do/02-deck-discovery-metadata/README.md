# 02 — Deck discovery metadata

**Status:** Done
**Depends on:** 01 (Tags) ideally, but the field additions here don't strictly require it
**Unblocks:** 03 (Favorites), 04 (Ratings/Comments), 05 (Collections), 16 (Analytics)

## Scope

Add the metadata fields that a real Explore/Discover page needs: publish status, language, difficulty, age range, license, and the denormalized counters (`playCount`, `favoriteCount`, `averageRating`, etc.) so the deck card can render without n+1 queries.

Today `Deck` only has `system: boolean` + `DeckVisibility` which doesn't distinguish "I'm still drafting" from "I've shipped this to the public" — fix that.

## New enums

```text
PublishStatus     DRAFT, PUBLISHED, ARCHIVED
License           ALL_RIGHTS_RESERVED, CC_BY, CC_BY_SA, CC_BY_NC, CC0
```

## Updates to existing models

- **Deck**
  - `PublishStatus publishStatus` — defaults to `DRAFT`
  - `LocalDateTime publishedAt` — set when publishStatus transitions to PUBLISHED
  - `String language` — BCP-47 (`en`, `en-US`, `es`, ...); default `en`
  - `Difficulty difficulty` — re-use existing enum; default `MEDIUM`
  - `String ageRange` — e.g. `"6-9"`, `"10-12"`, `"13+"`, `"adult"`; nullable
  - `License license` — default `ALL_RIGHTS_RESERVED`
  - `String originalAuthorUserId` — for cloned/forked decks (distinct from `parentDeckId` which is the lineage pointer; this is who first wrote it)
  - `int playCount` — denormalized; incremented when a InteractiveSession using this deck transitions to FINISHED
  - `int viewCount` — denormalized; incremented when `GET /api/decks/{id}` is called by a non-owner
  - `int favoriteCount` — denormalized; updated by chunk 03
  - `double averageRating` — denormalized; updated by chunk 04
  - `int ratingCount` — denormalized; updated by chunk 04
  - `LocalDateTime lastPlayedAt` — denormalized; updated when a InteractiveSession finishes

## Backend changes

- `DeckService.publish(deckId, userId)` — checks ownership/collaborator role, sets `publishStatus = PUBLISHED` + `publishedAt = now`, validates the deck has at least one scored element (or just allow it — your call)
- `DeckController` — add `POST /api/decks/{id}/publish`, `POST /api/decks/{id}/unpublish` (sets back to DRAFT), `POST /api/decks/{id}/archive`
- `InteractiveSessionService.finish()` — on game end, increment `Deck.playCount` and set `Deck.lastPlayedAt`. Use `$inc` so it's race-free
- `DeckController.findById` — increment `viewCount` for non-owner reads only
- `DeckRepository` — add an index `(publishStatus, visibility, averageRating DESC, playCount DESC)` for Explore ordering
- New endpoint: `GET /api/decks/explore` — paginated, filterable by `?tagId=`, `?language=`, `?difficulty=`, sortable by `?sort=trending|new|top-rated|most-played`. Only returns `publishStatus = PUBLISHED` + `visibility = PUBLIC` decks.

## Frontend changes

- Deck editor navbar gets a **Publish** button (turns into "Unpublish" + status pill once published)
- Deck card shows: play count, average rating (with star icon), language flag, difficulty pill
- New `/explore` route with filter sidebar (tags, language, difficulty) and sort dropdown
- "Drafts" tab on the user's deck list shows decks where `publishStatus = DRAFT`

## Migration / seeding

- All existing decks: set `publishStatus = PUBLISHED` if `system = true` else `DRAFT`. Set `publishedAt = createdAt` for newly-PUBLISHED rows. Set `language = "en"`.
- `SampleDataSeeder` updates LOTR sample decks to be `PUBLISHED` with `language = "en"`, `difficulty = MEDIUM`, `license = CC_BY`.

## Checklist

- [x] New enums + field additions in `Deck`
- [x] Migration script for existing decks
- [x] `publish` / `unpublish` / `archive` endpoints + tests
- [x] `playCount` increment on InteractiveSession finish (+ test)
- [x] `viewCount` increment on non-owner read (+ test)
- [x] `/api/decks/explore` endpoint + tests
- [x] Deck card UI updates (rating, plays, language, difficulty)
- [x] `/explore` route + filter sidebar
- [x] Drafts tab on the user's deck list
- [x] Frontend codegen + lint
- [x] Backend tests pass
