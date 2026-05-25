# 05 — Deck collections

**Status:** Done
**Depends on:** 02 (publish status — collections can include drafts only if you own them)
**Unblocks:** Nothing critical; sets up a future "Course / Series" concept

## Scope

Let users (and orgs) group decks into ordered, named collections — the equivalent of "folders" in Kahoot or "Series" in Mentimeter. A deck can appear in multiple collections.

## New models

```text
DeckCollection                         @Document("deck_collections")
  @Id String id
  String ownerUserId
  String organizationId                // nullable — org-shared collection
  String name, description
  Image cover                          // re-use existing Image record
  List<String> deckIds                 // ordered
  DeckVisibility visibility            // re-use existing enum
  int viewCount                        // denorm
  LocalDateTime createdAt, updatedAt
```

Indexes:

- `ownerUserId`
- `organizationId`
- `(visibility, updatedAt DESC)` for public collection browsing

## Backend changes

- `DeckCollectionRepository`, `DeckCollectionService`, `DeckCollectionController`
- Endpoints:
  - `GET    /api/collections/mine` — caller's collections (paginated)
  - `GET    /api/collections/{id}` — one collection + embedded deck DTOs (or just `deckIds` if you want the frontend to fetch decks lazily)
  - `POST   /api/collections` — create; body `{ name, description?, organizationId? }`
  - `PUT    /api/collections/{id}` — update name/description/cover/visibility (owner only)
  - `DELETE /api/collections/{id}` — owner only
  - `POST   /api/collections/{id}/decks` — body `{ deckId, position? }`; append by default
  - `DELETE /api/collections/{id}/decks/{deckId}` — remove
  - `PATCH  /api/collections/{id}/decks` — body `{ deckIds: [...] }`; reorder (replace the whole array, validates ids)
- Authorization rules:
  - Anyone can read a `PUBLIC` collection (skip if `visibility` is `PRIVATE` and caller isn't the owner)
  - Org collections require caller to be in `organizationId`
  - Only the owner can mutate

## Frontend changes

- New `/my-decks/collections` route showing collection cards
- New `/collections/$collectionId` route showing the ordered deck list with drag-to-reorder
- "Add to collection" menu item on deck card right-click + on deck detail page
- Modal-based create flow using `useModal`

## Cross-cutting concerns

- `Image cover` reuses the existing pattern from `Deck` — use `useExternalImg`/`internalImgId` and the `DeckImageMapper` flow
- Don't enforce uniqueness on collection name — users can have two "My Favorites" collections if they want
- A deck removed from MongoDB shouldn't break collections; treat missing `deckId`s as silently filtered out on read

## Checklist

- [x] `DeckCollection` model + repo + service + controller + tests
- [x] Reorder mutation with optimistic UI via `apiEnhancements.ts`
- [ ] Cover image upload (reuse theme background flow) — deferred; the
      cover field on the model and DTOs is wired through, but the upload
      endpoint + UI picker can land alongside the broader media-asset work
      in chunk 19.
- [x] `/my-decks/collections` route
- [x] `/collections/$collectionId` route with drag-to-reorder
- [x] "Add to collection" right-click + deck-detail menu
- [x] Frontend codegen + lint
- [x] Backend tests pass
