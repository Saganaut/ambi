# 25 — Per-kind slide editor hooks

**Status:** ✅ Complete. Hooks, component migrations, per-item card extraction, drag-to-reorder for non-MCQ collections, and per-block hooks for the Slide block stack are all landed.
**Depends on:** nothing
**Unblocks:** future slide-content refactors (shared structural patterns for new kinds)

## Scope

`frontend/src/components/DeckEditor/SlideContentTypes/useElementEditor.ts`
already ships `useElementEditor<T>(predicate)` — the shared read/write
boundary for every slide-content author surface. Two MCQ-specific hooks
(`useMcqQuestionEditor`, `useMcqOptionEditor`) compose it and remove all
buildPatch / bounds-checking / structural-op boilerplate from the MCQ
editor + per-option card.

Every other slide-content component still hand-rolls that plumbing inline:
local mirror per field, a `buildPatch(overrides)` helper, manual bound
checks for collection caps, and per-component `flush()` choreography
before structural ops. Centralizing that into per-kind hooks (mirroring
the MCQ split) gives us:

- A single place per kind that knows the question's shape, default values,
  and collection bounds.
- Symmetric APIs across kinds — `schedule(partial)` / `commit(partial)`
  for field edits; collection ops on the hook for kinds with nested items
  (`addItem` / `removeItem` / `updateItem` + bounds-aware `canAdd` /
  `canRemove`).
- A natural seam to extract per-item cards later (the way `McqOptionEditable`
  was extracted from `McqSlideContent`).

## Approach

Each per-kind hook composes `useElementEditor<T>(isXxx)` and returns:

```ts
{
  question: T | undefined;                    // narrowed element from cache
  schedule: (patch: Partial<T>) => void;      // debounced merge into cached element
  commit:   (patch: Partial<T>) => void;      // immediate merge into cached element
  flush:    () => void;                       // fire any pending debounced commit
  syncedFromId: string | undefined;           // resync sentinel for local mirrors
  markSynced:   (id: string | undefined) => void;
  // … plus collection ops where the kind has nested items
}
```

For collection-shaped kinds (`AllocationQuestion`, `MatchingQuestion`,
`RankingQuestion`, `ScalesQuestion`), the hook also exposes:

```ts
{
  items: Item[];
  canAdd: boolean;
  canRemove: boolean;
  addItem:    () => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, patch: Partial<Item>, mode?: "schedule" | "commit") => void;
}
```

For kinds with a single nested struct (`GridQuestion.cells`,
`PlaceOnImageQuestion.targetImage`, `DrawingQuestion.backingImage`), the
hook stays flat and exposes domain-named helpers (`setBackingImage`,
`setTargetImage`) so callers don't reach into nested keys.

The `Slide` kind (block stack) is the most complex. Phase 1 surfaces a
flat `useSlideEditor` that owns title / slideKind / displaySeconds /
audio / video; per-block editors stay inline for now and the block-list
ops (`addBlock`, `removeBlock`, `moveBlock`, `updateBlock`) live on the
hook. Splitting each block kind into its own editable component is
follow-up work.

## Kinds covered

| Kind                  | Hook                          | Shape       |
| --------------------- | ----------------------------- | ----------- |
| McqQuestion           | `useMcqQuestionEditor` ✓      | collection  |
| McqQuestion (option)  | `useMcqOptionEditor` ✓        | item        |
| TextQuestion          | `useTextQuestionEditor`       | flat        |
| NumberQuestion        | `useNumberQuestionEditor`     | flat        |
| WordCloudQuestion     | `useWordCloudEditor`          | flat        |
| QAndAQuestion         | `useQAndAEditor`              | flat        |
| DrawingQuestion       | `useDrawingEditor`            | flat + img  |
| PlaceOnImageQuestion  | `usePlaceOnImageEditor`       | flat + img  |
| GridQuestion          | `useGridQuestionEditor`       | flat + img  |
| AllocationQuestion    | `useAllocationEditor`         | collection  |
| MatchingQuestion      | `useMatchingEditor`           | collection  |
| RankingQuestion       | `useRankingEditor`            | collection  |
| ScalesQuestion        | `useScalesEditor`             | collection  |
| Slide                 | `useSlideEditor`              | block stack |

All hooks live next to the existing MCQ hooks in
`frontend/src/components/DeckEditor/SlideContentTypes/useElementEditor.ts`
so the composition story stays in one file.

## Checklist

### Hooks

- [x] `useTextQuestionEditor`
- [x] `useNumberQuestionEditor`
- [x] `useWordCloudEditor`
- [x] `useQAndAEditor`
- [x] `useDrawingEditor`
- [x] `usePlaceOnImageEditor`
- [x] `useGridQuestionEditor`
- [x] `useAllocationEditor` + `useAllocationOptionEditor`
- [x] `useMatchingEditor` + `useMatchingPairEditor`
- [x] `useRankingEditor` + `useRankingItemEditor`
- [x] `useScalesEditor` + `useScalesStatementEditor`
- [x] `useSlideEditor`

### Component migrations

- [x] `TextSlideContent` → `useTextQuestionEditor`
- [x] `NumberSlideContent` → `useNumberQuestionEditor`
- [x] `WordCloudSlideContent` → `useWordCloudEditor`
- [x] `QAndASlideContent` → `useQAndAEditor`
- [x] `DrawingSlideContent` → `useDrawingEditor`
- [x] `PlaceOnImageSlideContent` → `usePlaceOnImageEditor`
- [x] `GridSlideContent` → `useGridQuestionEditor`
- [x] `AllocationSlideContent` → `useAllocationEditor` *(collection list still local-state-mirrored for the seed-on-empty UX; per-item editor extraction is the follow-up that earns `useAllocationOptionEditor` its keep)*
- [x] `MatchingSlideContent` → `useMatchingEditor` *(same local-state-mirror caveat as Allocation — per-pair editor extraction deferred)*
- [x] `RankingSlideContent` → `useRankingEditor` *(rebuilds `correctOrder` from `items` on every structural commit; same per-item extraction deferral)*
- [x] `ScalesSlideContent` → `useScalesEditor` *(same per-statement extraction deferral)*
- [x] `SlideContent` → `useSlideEditor` *(per-block editors still live in their own files; the hook owns the block-list ops)*

### Follow-up

- [x] Drag-to-reorder for non-MCQ collections (mirror MCQ `handleOptionDragEnd` / `moveMcqOption` endpoint). Backend `moveAllocationOption`, `moveMatchingPair`, `moveRankingItem`, `moveScaleStatement` shipped with controller endpoints under `POST /api/decks/{id}/elements/{elementId}/{collection}/{itemId}/move` and DeckService unit tests for each (`DeckServiceTest`). Ranking rewrites `correctOrder` in lock-step with `items`; Scales re-permutes `correctRatings` when scored. Frontend `useAllocationEditor` / `useMatchingEditor` / `useRankingEditor` / `useScalesEditor` each expose a uniform `handleDragEnd`; shared `ItemList` wraps children in `DragDropProvider` when given an `onDragEnd`; shared `ItemCard` registers `useSortable` when given `sortId` + `sortIndex`. Cache-sync enhancements wired in `store/enhancements/deck.ts` for all four new mutations.
- [x] Per-item card extraction for collection kinds (mirror `McqOptionEditable`). Each row now owns its own debounce timer via the per-item editor hook (`useAllocationOptionEditor`, `useMatchingPairEditor`, `useRankingItemEditor`, `useScalesStatementEditor`). Parents read `items` straight from the cache (`editor.items`) and call `addItem` / `removeItem` instead of hand-rolling structural commits; the redundant local-mirror seed in `AllocationSlideContent` + `MatchingSlideContent` is gone (the cache already ships with 4 default items from `buildNewElement`). Ranking + Scales remain empty-on-create by design.
  - [x] `AllocationOptionEditable` + delegate `AllocationSlideContent` to `useAllocationEditor` collection ops
  - [x] `MatchingPairEditable` + delegate `MatchingSlideContent` to `useMatchingEditor` collection ops
  - [x] `RankingItemEditable` + delegate `RankingSlideContent` to `useRankingEditor` collection ops
  - [x] `ScaleStatementEditable` + delegate `ScalesSlideContent` to `useScalesEditor` collection ops
- [x] Split block-kind editors into their own components inside `SlideContent/` subfolder and back them with per-block hooks composed on top of `useSlideEditor`. Each block editor (`HeadingBlockEditor`, `BodyBlockEditor`, `BulletListBlockEditor`, `ImageBlockEditor`, `CalloutBlockEditor`) now consumes its own per-kind hook (`useHeadingBlockEditor`, `useBodyBlockEditor`, `useBulletListBlockEditor`, `useImageBlockEditor`, `useCalloutBlockEditor`) and takes only a `blockId` prop — `onUpdate` / `onFlush` props are gone, and `BlockCard` no longer threads them. `useBulletListBlockEditor` exposes `items` / `canAdd` / `canRemove` / `addItem` / `removeItem` / `updateBulletItem` mirroring the collection-kind shape; the rest stay flat.

## Cross-cutting reminders

- **No new bounds.** Each hook reuses the bounds the existing component
  already enforces (e.g. `MIN_OPTIONS=2 / MAX_OPTIONS=8` for Allocation).
  We are not changing the data shape.
- **Local mirror still owned by components.** Hooks read from the deck
  cache for everything — they do not own field-level local state. Each
  component still maintains a local mirror for inputs that need
  responsive display (RichTextInput, NumberInput, etc.) and resyncs via
  `syncedFromId` / `markSynced` when the active element changes.
- **Structural ops flush first.** Every `add* / remove* / move*` op on
  the hook calls `flush()` before commit, mirroring the MCQ pattern, so
  a pending debounced text edit never races a structural commit.
- **No backend changes.** This chunk is pure frontend plumbing.
