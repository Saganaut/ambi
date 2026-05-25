# 03 — Deck favorites

**Status:** Complete
**Depends on:** 02 (needs `Deck.favoriteCount` for the denorm)
**Unblocks:** 04 (similar join-table pattern), 18 (notifications can reference favorited decks)

## Scope

Let users star/favorite decks for quick recall. Drives the "My Favorites" surface and the `favoriteCount` denorm on `Deck`.

## New models

```text
DeckFavorite                           @Document("deck_favorites")
  @Id String id
  @Indexed String userId
  @Indexed String deckId
  LocalDateTime favoritedAt
  // compound unique index (userId, deckId) — refuse double-favorites at the DB level
```

## Backend changes

- `DeckFavoriteRepository` with `findByUserIdAndDeckId`, `findAllByUserId(Pageable)`, `countByDeckId`
- `DeckFavoriteService`:
  - `favorite(userId, deckId)` — idempotent (catch duplicate-key, treat as no-op), `$inc Deck.favoriteCount` only on actual insert
  - `unfavorite(userId, deckId)` — idempotent; `$inc Deck.favoriteCount -1` only if delete actually removed a row
- Endpoints (under `DeckController`):
  - `POST   /api/decks/{id}/favorite` — returns the (now) current favoriteCount
  - `DELETE /api/decks/{id}/favorite`
  - `GET    /api/users/me/favorites` — paginated list of favorited decks (returns Deck DTOs, not the favorite rows)
- `DeckDTO` — add `boolean isFavorited` populated **only** when the caller is authenticated; default `false` for guests. Use a lightweight `Set<String>` lookup on the request scope to batch-resolve for list endpoints.

## Frontend changes

- Heart icon component on `DeckCard` (filled = favorited, outline = not). Uses `useToggleDeckFavoriteMutation`.
- Optimistic toggle via `onQueryStarted` in `apiEnhancements.ts` — flip `isFavorited` and bump `favoriteCount` in the cached `getDeck` and any list query containing this deck.
- New `/my-favorites` route showing the favorites list.
- Heart icon also lives in the deck detail page header.

## Cross-cutting concerns

- Don't store the favorite list inline on `User.favoriteDeckIds` — the doc would grow unbounded. Use the join collection.
- `Deck.favoriteCount` is the authoritative count for display; `count(deck_favorites where deckId=...)` is the authoritative count for reconciliation. Add a `recountFavorites` admin endpoint for fixing drift.

## Checklist

- [x] `DeckFavorite` model + repository
- [x] `DeckFavoriteService` with idempotent favorite/unfavorite + `$inc` of `Deck.favoriteCount`
- [x] Endpoints + service tests
- [x] `DeckDTO.isFavorited` populated for authenticated callers in batch
- [x] Heart icon component + optimistic cache update
- [x] `/my-favorites` route
- [x] Recount admin endpoint
- [x] Frontend codegen + lint
- [x] Backend tests pass
