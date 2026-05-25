# 01 — Tags & taxonomy

**Status:** Done
**Depends on:** Nothing
**Unblocks:** 02 (Deck discovery metadata), 10 (Common element additions)

## Scope

Promote `Deck.tags: List<String>` (free-form strings) to a first-class `Tag` model so we can build a real Explore surface with hierarchical topics (Subject → Sub-topic), faceted search, and per-question tagging later.

`Deck.tags` stays as a transitional read-only mirror until the frontend is fully migrated, then is removed.

## New models

```text
Tag                                    @Document("tags")
  @Id String id                        // slug, e.g. "math", "history-ww2"
  String displayName
  String parentTagId                   // null = root; enables Subject -> Sub-topic
  String description
  String iconUrl                       // optional, for the Explore page
  int deckCount                        // denormalized — recompute nightly or on write
  @Indexed boolean curated             // surfaced in default Explore facets
  LocalDateTime createdAt, updatedAt
```

Indexes:

- Unique on `id` (already implied by `@Id`)
- `parentTagId` for tree traversal
- Compound `(curated DESC, deckCount DESC)` for default Explore ordering

## Updates to existing models

- **Deck**
  - Add `List<String> tagIds` — primary tagging field going forward
  - Add `String subjectTagId` — primary tag (always points at a root tag)
  - Keep `List<String> tags` for now; populate it from `tagIds` on read for the duration of the migration

## Backend changes

- New `TagRepository` + `TagService` + `TagController`
- Endpoints:
  - `GET  /api/tags` — list (with `?curated=true`, `?parentTagId=...`, `?search=...`)
  - `GET  /api/tags/{id}` — one tag + children
  - `POST /api/tags` — admin only (gate via `UserRole.ADMIN` once chunk 20 ships; gate via env-allowlist in the meantime)
  - `PUT  /api/tags/{id}` — admin only
  - `DELETE /api/tags/{id}` — admin only; refuse if `deckCount > 0`
- Update `DeckController.update` to validate every incoming `tagId` exists
- `SampleDataSeeder` seeds a small curated taxonomy: General Knowledge, Math, History, Science, Sports, Pop Culture, Trivia
- Recount job: on app boot in `--seed.run=true` mode, recompute `deckCount` per tag

## Frontend changes

- New `TagPicker` component in `components/Common/` — multi-select with typeahead and an inline "create tag" affordance (admin only)
- Deck editor `Inspector` sidebar gets a "Tags" section using `TagPicker`
- Explore page (new route `/explore`) lists curated tags as filter chips
- Deck cards show the first 2–3 tags as pills

## Migration / seeding

- One-time migration script: for every existing `Deck.tags` entry, find-or-create a `Tag` with `id = slugify(text)` and push to `tagIds`. Leave `tags` as-is for now.
- Subject tag picker on the deck editor; default to the first matched curated tag.

## Checklist

- [x] `Tag` model + repository + service + controller + tests
- [x] OpenAPI re-export and frontend codegen
- [x] `Deck.tagIds` + `Deck.subjectTagId` fields added; `tags` populated from `tagIds` on read
- [x] `TagPicker` component + design-system entry
- [x] Deck editor wires `tagIds` and `subjectTagId`
- [x] `SampleDataSeeder` seeds curated tags
- [x] One-time migration script committed under `scripts/`
- [x] Frontend lint + tests pass
- [x] Backend tests pass (`./mvnw test`)
