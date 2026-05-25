# 04 — Deck ratings & comments

**Status:** Done
**Depends on:** 02 (`Deck.averageRating`, `ratingCount` denorms)
**Unblocks:** 18 (notifications can reference comment events)

## Scope

Two related social features for `Deck`:

1. **Ratings** — 1–5 star score per user per deck, optionally with a short written review.
2. **Comments** — threaded comments with upvotes, edit/delete, soft-delete preserves thread shape.

Both feed denormalized fields on `Deck` so list views don't need joins.

## New models

```text
DeckRating                             @Document("deck_ratings")
  @Id String id
  @Indexed String deckId
  @Indexed String userId
  int stars                            // 1..5; validate at service layer
  String review                        // nullable, max 2000 chars
  LocalDateTime createdAt, updatedAt
  // compound unique index (deckId, userId) — one rating per user per deck
```

```text
DeckComment                            @Document("deck_comments")
  @Id String id
  @Indexed String deckId
  String authorUserId
  String authorName, authorPictureUrl  // denorm so deleted users don't break threads
  String parentCommentId               // null = top-level
  String body                          // markdown, max 4000 chars
  int upvotes
  Set<String> upvoterUserIds           // for "did I upvote?" + duplicate prevention
  boolean edited, deleted              // soft-delete keeps thread shape
  LocalDateTime createdAt, updatedAt, deletedAt
```

## Backend changes

### Ratings

- `DeckRatingRepository`, `DeckRatingService`
- `DeckRatingService.upsert(deckId, userId, stars, review)` — find-or-create, then recompute `Deck.averageRating` and `Deck.ratingCount`. Use `MongoTemplate.aggregate` `{ $group: avg, count }` or maintain incrementally with a running sum field.
- Endpoints under `DeckController`:
  - `PUT    /api/decks/{id}/rating` — upsert; body `{ stars, review }`
  - `DELETE /api/decks/{id}/rating` — remove own rating
  - `GET    /api/decks/{id}/ratings?page=&size=` — list reviews with text
  - `GET    /api/decks/{id}/rating/mine` — current user's rating, or 404

### Comments

- `DeckCommentRepository`, `DeckCommentService`
- Endpoints:
  - `GET    /api/decks/{id}/comments?page=&size=` — top-level comments, paginated
  - `GET    /api/decks/{deckId}/comments/{commentId}/replies` — children of one comment
  - `POST   /api/decks/{id}/comments` — body `{ body, parentCommentId? }`
  - `PUT    /api/decks/{deckId}/comments/{commentId}` — author only
  - `DELETE /api/decks/{deckId}/comments/{commentId}` — author only; soft-delete (sets `deleted=true`, replaces body with `"[removed]"`)
  - `POST   /api/decks/{deckId}/comments/{commentId}/upvote` — toggle; idempotent
- `DeckDTO` — add `boolean isRatedByMe` and `Integer myRating` (nullable) when authenticated

## Frontend changes

- `StarRating` component (input + read-only) in `components/Common/`
- Deck detail page gains a "Reviews" tab with the rating distribution histogram + paginated list
- Deck detail page gains a "Discussion" tab with the threaded comment view
- `CommentThread` component supports infinite scroll for top-level comments and "Show N replies" for children
- Optimistic upvote toggle via `apiEnhancements.ts`

## Cross-cutting concerns

- `Deck.averageRating` is `(sum of stars) / ratingCount` rounded to 1 decimal. Maintain incrementally to avoid scanning the collection on every write.
- Comment moderation hooks come in chunk 18 (notifications) or a later moderation chunk. For now, only the author can edit/delete.
- Soft-delete keeps `parentCommentId` chains intact so replies don't orphan.

## Checklist

- [x] `DeckRating` model + repo + service + endpoints + tests
- [x] `DeckComment` model + repo + service + endpoints + tests
- [x] Incremental `Deck.averageRating` / `ratingCount` updates
- [x] `DeckDTO.isRatedByMe`, `myRating` populated for authenticated callers
- [x] `StarRating` component
- [x] Reviews tab on deck detail page with rating histogram
- [x] Discussion tab with `CommentThread` component
- [x] Optimistic upvote toggle in `apiEnhancements.ts`
- [x] Frontend codegen + lint
- [x] Backend tests pass
