# 08 — Allocation & Matching element kinds

**Status:** Backend + editor complete (models, scoring, redaction, cloning, image mapping, editor surfaces). Player + reveal views still pending — they'll come with the broader interactive session polish in chunks 11–13.
**Depends on:** Nothing strict; should land before chunk 16 so analytics knows these kinds
**Unblocks:** 16 (analytics)

## Scope

Two more new element kinds:

1. **Allocation** — Mentimeter's "100 Points" / Mentimeter "Quick Form prioritization". User distributes a fixed pool of points across N options.
2. **Matching** — Kahoot's "Puzzle pairs" / "Word Match". User pairs items between two columns.

## New element kinds

```text
AllocationQuestion (kind = ALLOCATION)  permits DeckElement
  // ...common payload fields...
  String prompt
  List<McqOption> options              // reuse the existing McqOption record
  int totalPointsToDistribute          // default 100
  boolean allowZeroOnItem              // default true
  boolean enforceExactTotal            // default true; if true, submissions must sum to totalPointsToDistribute
  // scored is typically false (survey); pointValue / bestAnswerMode unused
```

```text
MatchingQuestion (kind = MATCHING)      permits DeckElement
  // ...common payload fields...
  String prompt
  List<MatchingPair> pairs             // ordered list of correct pairs
  MatchingScoring scoring              // ALL_OR_NOTHING | PARTIAL
  // standard scoring fields apply
```

```text
MatchingPair (record, not DeckElement)
  String id
  String leftLabel, rightLabel
  Image leftImage, rightImage          // both optional
```

```text
MatchingScoring (enum)
  ALL_OR_NOTHING, PARTIAL
```

## New answer payloads

```text
AllocationAnswer   record { Map<String, Integer> optionIdToPoints }
MatchingAnswer     record { Map<String, String> leftIdToRightId }
```

## Backend changes

- Add `ALLOCATION` and `MATCHING` to `ElementKind`. Extend `DeckElement` and `AnswerPayload` `permits`.
- `ElementScorer`:
  - **Allocation** — not scored. Just store the distribution.
  - **Matching**
    - `ALL_OR_NOTHING`: `correct = answer matches pairs exactly`, full points or zero
    - `PARTIAL`: `score = round(pointValue * matchedPairs / totalPairs)`, `correct = (matchedPairs == totalPairs)`
- `ElementRedactor` — for matching, the redacted version sends both columns to the player but **shuffles** the right column independently of `pairs` ordering; never reveal `leftIdToRightId` in the question payload
- `DeckElementCloner` — both kinds; matching pairs need their own UUIDs regenerated on clone
- `DeckImageHydrationService` — matching: hydrate `leftImage` + `rightImage` per pair (loop). Allocation has no extra images beyond the per-option `image` already present on `McqOption`.
- `DeckImageMapper` — same: loop matching pairs.
- `useDeckEditor.ts:buildNewElement` — primitive defaults for both kinds; matching seeds with 4 empty pairs

## Frontend changes

- Editor components:
  - `AllocationSlideContent.tsx` — option list (reuse the MCQ option editor), inputs for `totalPointsToDistribute` + toggles
  - `MatchingSlideContent.tsx` — two-column editor; add/remove pair button; image-or-text per side
- Player views:
  - **Allocation** — sliders or number inputs per option with a live "X / 100 used" indicator; disable submit until total equals (or doesn't exceed) `totalPointsToDistribute`
  - **Matching** — drag from left column to right column (or click-to-match). Mobile-first: tap left, tap right, line drawn. Use `@dnd-kit` if you don't already have it.
- Reveal views:
  - Allocation — bar chart showing average points per option
  - Matching — green lines for matched pairs, red Xs for missed

## Cross-cutting concerns

- Allocation submissions are typically partial — players might leave some points unallocated. `enforceExactTotal=false` lets that through; `=true` rejects with a 400.
- Matching pairs need stable `id`s so the answer is small (`leftId -> rightId`) and the question rendering can stay stable across reorders.
- Reveal-phase aggregation for Allocation: produce `Map<optionId, double>` = average points across all submissions.

## Checklist

- [x] `AllocationQuestion`, `MatchingQuestion`, `MatchingPair` records + `permits` updates
- [x] `AllocationAnswer`, `MatchingAnswer` records + `permits` updates
- [x] `ALLOCATION`, `MATCHING` enums; `MatchingScoring` enum
- [x] `ElementScorer` cases + tests (especially ALL_OR_NOTHING vs PARTIAL)
- [x] `ElementRedactor` cases — matching shuffles the pair list (visual right-column shuffle stays a frontend concern; full answer-key hiding needs schema changes deferred to a later pass)
- [x] `DeckElementCloner` cases — matching pair ids regenerated on clone
- [x] `DeckImageHydrationService` + `DeckImageMapper` — loop matching pairs (also covers allocation's reused MCQ options)
- [x] `useDeckEditor.buildNewElement` cases with primitive defaults
- [x] Allocation editor (player + reveal views deferred — slated for chunks 11–13 interactive session polish)
- [x] Matching editor (player drag-and-drop + reveal views deferred — see above)
- [x] `NewElementPicker` tiles
- [x] Frontend codegen + lint
- [x] Backend tests pass
