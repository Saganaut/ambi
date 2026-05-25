# 07 — Word Cloud & True/False element kinds

**Status:** Word Cloud complete (editor + scoring + live aggregation broadcast + player input + reveal cloud). True/False dropped — an MCQ with 2 options already covers that use case.
**Depends on:** Nothing strict; chunk 10 will tidy common provenance fields afterwards
**Unblocks:** 16 (analytics needs every element kind to be known)

## Scope

Two new element kinds. Both are simple but together cover Mentimeter's most-used non-quiz format (Word Cloud) and Kahoot's most-requested question (True/False).

## New element kinds

```text
WordCloudQuestion (kind = WORD_CLOUD)   permits DeckElement
  // ...common payload fields (id, publicKey, privateKey, title, styledTitle, ...)
  String prompt
  int maxSubmissionsPerPlayer          // default 3 (Mentimeter pattern)
  int maxWordLength                    // default 30
  boolean caseSensitive                // default false
  boolean profanityFilter              // default true
  Set<String> bannedWords              // host-supplied additions
  // common scoring/display fields stay; scored is always false, survey is true
```

```text
TrueFalseQuestion (kind = TRUE_FALSE)   permits DeckElement
  // ...common payload fields...
  String prompt
  boolean correctAnswer                // the truthy value
  String explanation
  // standard scoring fields apply; pointValue default 100
```

## New answer payloads

```text
WordCloudAnswer    record { List<String> words }
TrueFalseAnswer    record { boolean value }
```

Add `WORD_CLOUD` and `TRUE_FALSE` to `ElementKind`. Extend the sealed `permits` lists on both `DeckElement` and `AnswerPayload`.

## Backend changes

- `ElementScorer.score(DeckElement, AnswerPayload)`:
  - `TrueFalseQuestion` × `TrueFalseAnswer` → `correct = q.correctAnswer == a.value`, points like MCQ
  - `WordCloudQuestion` × `WordCloudAnswer` → not scored; just record submissions
- `ElementRedactor` — for word cloud, when serving the question to a player, the question itself reveals nothing; for reveal phase, send aggregated word counts not raw submissions per user
- `DeckElementCloner` — handle both new records in clone-by-value
- `DeckImageHydrationService` / `DeckImageMapper` — both kinds support `image` / `background`, so the existing common-field mapping covers them; no special media fields
- New aggregator method in `InteractiveSessionService` or a new `WordCloudAggregator`:
  - Returns `Map<String, Integer>` of normalized word → count for the current interactive session + element
  - Normalization: lower-case (if `caseSensitive=false`), trim, drop banned words, strip punctuation
  - Used by both the reveal-phase WebSocket push and the deck-analytics rollup later
- `useDeckEditor.ts:buildNewElement` (frontend) needs `WORD_CLOUD` and `TRUE_FALSE` cases with primitive defaults

## Frontend changes

- New editor components:
  - `WordCloudSlideContent.tsx` under `SlideContentTypes/` — prompt + max-submissions + word-length sliders + banned-words chips
  - `TrueFalseSlideContent.tsx` — prompt + radio for the correct answer + explanation
- `NewElementPicker.tsx` — add two tiles with icons (use Heroicons `ChatBubbleLeftEllipsisIcon` and `CheckBadgeIcon` or pick something distinct)
- InteractiveSession player view:
  - True/False: two big buttons
  - Word Cloud: text input + "Submit" button, then show a live-updating word cloud (re-use a lightweight cloud renderer like `react-wordcloud` or render in CSS with sized spans — design decision)
- InteractiveSession reveal view:
  - Word Cloud reveals the aggregated cloud (already shown live; this is the "final" version)
  - True/False reveals the bar split + correct answer pill

## Cross-cutting concerns

- Word Cloud is **survey-only**. Don't let it accept `bestAnswerMode = true` — the editor should hide that toggle.
- Profanity filter: ship a tiny built-in list (or none) in v1; rely on `bannedWords` for host control. Don't bring in a heavy library.
- True/False scoring follows the same speed-bonus rules as MCQ.

## Checklist

- [x] `WordCloudQuestion` record + `permits` updates  *(True/False dropped — MCQ-of-2 covers it)*
- [x] `WordCloudAnswer` record + `permits` updates
- [x] `ElementKind` enum update (`WORD_CLOUD`)
- [x] `ElementScorer` case + tests
- [x] `ElementRedactor` case
- [x] `DeckElementCloner` case
- [x] `WordCloudAggregator` + tests
- [x] WebSocket emits aggregated word cloud during SUBMIT phase (live + final on round complete)
- [x] `buildNewElement` frontend case with primitive defaults
- [x] Editor component for Word Cloud
- [x] Player + reveal view for Word Cloud
- [x] `NewElementPicker` tile
- [x] Frontend codegen + lint
- [x] Backend tests pass
