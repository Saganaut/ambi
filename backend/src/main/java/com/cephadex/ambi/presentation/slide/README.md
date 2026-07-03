# Slide — domain & permissions

A `Slide` is a single screen within a deck: a question/prompt, its styling, and
(eventually) its typed `content`. **Slides are embedded in their deck** — the
[`Deck`](../deck/README.md) is the aggregate root and the persistence boundary. A slide is
a plain nested document (no `@Document`, no collection, no repository); it lives in
`Deck.slides` and is loaded, saved, versioned, and deleted *with* its deck.

> This doc is the authority for **who may do what** to a slide. The short version: a slide
> has **no identity, lifecycle, or permissions of its own** — it is part of the deck.

---

## Why embedded

Slides have no independent permissions and no independent lifecycle — the textbook signal
that they belong *inside* the aggregate, not beside it. Decks are bounded (nowhere near
Mongo's 16 MB document limit), so embedding is safe, and it buys:

- **Atomic reads/writes** — one round trip loads a deck and all its slides; one save
  persists content + ordering together.
- **Atomic reorder/link** — `sortOrder` and `parentId`/`childId` changes happen within a
  single document, so no multi-document transaction is ever needed.
- **One optimistic lock** — the deck's `@Version` guards the whole slide structure as a
  unit (see the [deck README](../deck/README.md)).
- **Free cleanup** — deleting the deck deletes its slides; there is no cascade to wire and
  no orphan risk.

> **On concurrent editing.** Embedding means two people editing *different* slides of the
> same deck both bump the deck's `@Version`, so the second save loses the optimistic-lock
> race and must reload. That's acceptable for best-effort concurrency. *True* real-time
> collaboration is a different mechanism entirely (the WebSocket / `EventPublisher` layer,
> not document-level locking), at which point storage layout is a downstream projection
> detail — so it doesn't argue against embedding now.

---

## Permissions: the deck decides everything

A slide has **no ownership, no visibility, no ACL**. Every access decision is the parent
deck's, made by its predicates (`canBeViewedBy` / `canBeEditedBy`):

| To … a slide | you must be able to … its deck |
| --- | --- |
| **view / list** | **view** the deck |
| **add / update / remove / reorder / link** | **edit** the deck |

There is **no slide-level MANAGE**: reordering, linking, and removal are just *editing the
deck's content*, so they need EDIT, nothing more.

Because slides are embedded and the deck is the aggregate root, slide operations are
**methods on `DeckService`**, not a separate service — a slide operation *is* a deck
operation: gate on the deck's VIEW/EDIT, mutate the embedded list, save the deck.

```text
DeckService.listSlides / getSlide          → getViewable(deckId, …)   → VIEW
DeckService.addSlide / updateSlide /        → getEditable(deckId, …)   → EDIT
            removeSlide
```

The `Deck` aggregate mediates its slide list (`findSlide`, `addSlide`, `removeSlide`); the
service handles auth, audit stamping, and persistence.

### Capability → exception

| Operation | Capability (on the deck) | On deny |
| --- | --- | --- |
| `listSlides`, `getSlide` | VIEW deck | `403 DECK_VIEW_FORBIDDEN` |
| `addSlide`, `updateSlide`, `removeSlide` | EDIT deck | `403 DECK_EDIT_FORBIDDEN` |
| deck not found | — | `404 DECK_NOT_FOUND` |
| slide id not in the deck | — | `404 SLIDE_NOT_FOUND` |

A slide denial *is* a deck denial, so the `403`/`404` deck codes surface unchanged and the
frontend branches on one contract.

---

## Lifecycle

- **Optimistic add.** The client may mint the slide's `id`; `addSlide` stamps
  `createdByUserId` / `lastEditedByUserId` and appends it (minting the `id` itself only if
  the client omitted it). The `id` is a client-minted UUID, so it doubles as the stable
  session handle — session snapshots copy slides verbatim and `RoundResult` / `Answer` key a
  round by `slide.id` (no separate `publicId`; the embed made it redundant).
- **Update** replaces the editable presentation fields and re-stamps `lastEditedByUserId`;
  `id` and `createdByUserId` are never reassigned. (A whole-deck `update` may also replace
  `Deck.slides` wholesale — the optimistic full-save path.)
- **Ordering** uses `sortOrder`, a [LexoRank](https://github.com/pravin-raha/lexorank4j)
  key computed **server-side** and never sent by the client (`SlideRankService` wraps the
  library so the rest of the domain never imports it). `addSlide` assigns a key after the
  current last; `PATCH /slides/{slideId}/move` (body `{ "to": <index> }`) rewrites *only*
  the moved slide's key to one between its new neighbours, rebalancing the run if a gap has
  closed. Slides sort by the key under natural `String` ordering; legacy slides without a
  key are backfilled (by array order) on the next edit and sort last until then. The
  embedded array is kept physically sorted to match — cheap, since the whole deck document
  is rewritten on every save anyway. `Deck.reorderSlide` / `backfillRanks` / `resort` hold
  the aggregate-side logic.
- **Linking** (`parentId` / `childId`) chains dependent slides: a linked child follows from
  its parent, links stay sequential, and a slide with a child must never jump straight to
  results. `removeSlide` now clears the dangling back-pointer on the other end of a link so
  nothing references a deleted slide; full chain re-stitching and contiguity enforcement on
  move/delete are a follow-up (see the `TODO(follow-up)` in `Deck`).

---

## Open items

1. **`Slide.version` is a plain `Integer`, not `@Version`.** With embedding, the deck's
   `@Version` already guards the whole structure, so a per-slide version is only useful if
   we later add *scoped merge-retry* (on a deck-level version clash, re-apply a
   single-slide edit to the fresh deck). Left in place for that future; unused today.
2. **`content` is wired in.** `Slide` carries a polymorphic `SlideContent content`
   (Mongo persists it with a `_class` hint), and it round-trips through
   `SlideRequest`/`SlideResponse`. On the wire it's a discriminated union keyed by
   `contentType` (the slide's `SlideType`); `SlideContent` exposes it to the OpenAPI spec
   via `@Schema(discriminatorProperty/oneOf/discriminatorMapping)` so the generated client
   sees a real union. `MCQ` (scorable) plus the four non-scorable display kinds —
   `TITLE` (title + optional subtitle), `CONTENT` (a rich-text body with box
   alignment, backed by `RichTextContent`), `MEDIA` (an image or an embedded YouTube video + optional
   caption), and `INSTRUCTION` (how to join the live session) — are wired end-to-end in
   the editor; the remaining kinds carry records but are not yet surfaced. Adding a type
   means: a `@JsonSubTypes.Type` entry on `SlideContent` and its `Scorable`/`NonScorable`
   sub-interface, plus a `oneOf` + `@DiscriminatorMapping` entry on the `SlideContent`
   schema. Content payloads are not yet `@Valid`-validated on the request side. Live-session
   board rendering of the non-scorable kinds (and runtime join-code substitution for
   `INSTRUCTION`) is a follow-up.
