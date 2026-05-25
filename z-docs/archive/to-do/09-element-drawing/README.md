# 09 — Drawing element kind

**Status:** Done. Backend, author editor, player canvas (Pointer events, palette + thickness, undo, clear, Douglas-Peucker downsampling on submit), and reveal grid (per-player thumbnails + click-to-lightbox + Best-Answer voting via `DrawingPreview` cards in `VotePanel`) all ship in this chunk.
**Depends on:** Nothing strict; 19 (MediaAsset) if you want to allow image underlays via the new uploader
**Unblocks:** 16 (analytics)

## Scope

Open canvas / "scribble" question type. Players draw on a blank or image-backed canvas; the answer is a list of strokes. Surveys-only — no scoring. Useful for ice-breakers, brainstorming, sketching demos.

This is the heaviest of the new element kinds — strokes can get big and the player UX has to work on touch devices.

## New element kind

```text
DrawingQuestion (kind = DRAWING)        permits DeckElement
  // ...common payload fields...
  String prompt
  Image backingImage                   // optional underlay (paint over a map, diagram, etc.)
  int canvasWidth                      // logical units; default 1920
  int canvasHeight                     // default 1080
  int maxStrokesPerPlayer              // default 200; cap to keep storage bounded
  int maxPointsPerStroke               // default 500
  List<String> palette                 // optional palette of color tokens; default = first 8 swatches from tokens.css
  // scored is always false; survey is true; pointValue / bestAnswerMode unused
```

## New answer payload

```text
DrawingAnswer (record, permits AnswerPayload)
  List<Stroke> strokes

Stroke (embedded record)
  String color                         // hex or oklch token name
  double thickness                     // logical units
  List<double> points                  // flat [x0, y0, x1, y1, ...] — half the JSON of an array of {x,y}
```

`ELEMENT_KIND.DRAWING` joins the enum and the sealed `permits` lists.

## Backend changes

- Add `DRAWING` to `ElementKind`; extend sealed `permits` on `DeckElement` and `AnswerPayload`.
- `ElementScorer` — `DrawingQuestion` returns `correct=false, pointsAwarded=0` (never scored).
- `ElementRedactor` — for the question payload, send `backingImage` + `canvasWidth/Height` + `palette`. No answer to redact.
- `DeckElementCloner` — handle DrawingQuestion.
- `DeckImageHydrationService` + `DeckImageMapper` — hydrate `backingImage`.
- **Storage strategy** — important: a single `DrawingAnswer` can be tens of KB. Two options:
  1. Inline in `PlayerAnswer.payload` (simplest, works today). Cap via `maxStrokesPerPlayer` and `maxPointsPerStroke`. Reject submissions over a per-payload byte limit (e.g. 256 KB).
  2. Push to S3 as JSON and store the key in `DrawingAnswer.s3Key` instead of inlining strokes.
  - **Recommendation:** start with (1). Add an `@Value("${app.drawing.max-payload-bytes:262144}")` cap and reject oversize answers.
- `AnswerSubmitRequest` validation — for `DrawingAnswer`, count total points and reject early if it exceeds the per-answer cap.
- `useDeckEditor.buildNewElement` — primitive defaults for DRAWING; default `palette` from the design-system token list.

## Frontend changes

- New `DrawingSlideContent.tsx` editor — preview canvas + backing-image picker + size selector + palette editor + caps inputs
- New player canvas component:
  - Mouse + touch + pen events (use Pointer events, not touch+mouse separately)
  - Single-finger draw, two-finger pan/zoom (or just lock pan/zoom in v1)
  - Color picker from `palette`
  - Undo last stroke (locally — don't post until submit)
  - Clear canvas
  - Submit button posts the full `DrawingAnswer`
- Reveal view:
  - Grid of player drawings (small thumbnails)
  - Click to expand into a lightbox
  - For the host: "vote for the best" toggle reuses the existing best-answer voting flow
- Performance — render strokes to an HTML canvas (`<canvas>`), not SVG. Throttle stroke point capture to ~60 Hz; downsample with a Douglas-Peucker pass before submit if the stroke is too dense.

## Cross-cutting concerns

- Best-answer voting is a natural fit — wire `bestAnswerMode = true` into the editor so drawings can be voted on without scoring.
- WebSocket pressure: if you ever want **live** drawing visible to other players, that's a separate, much bigger feature. v1 only sends the final `DrawingAnswer` at submit.
- Keep the strokes payload format stable — replays will read it years from now.

## Checklist

- [x] `DrawingQuestion` record + `permits` update
- [x] `DrawingAnswer` + `Stroke` records + `permits` update
- [x] `DRAWING` enum
- [x] `ElementScorer`, `ElementRedactor`, `DeckElementCloner` cases
- [x] `DeckImageHydrationService` + `DeckImageMapper` for `backingImage` (hydration routes through `DeckImageMapper`)
- [x] Per-answer byte cap (matches the WordCloud "silently drop" pattern — `submitAnswer` is a STOMP void, so a 400 is not the natural response shape; the question's `maxStrokesPerPlayer` / `maxPointsPerStroke` and `app.drawing.max-payload-bytes` (default 256 KB) all reject without storage or broadcast)
- [x] `buildNewElement` DRAWING case
- [x] Drawing editor component
- [x] Drawing player canvas (`DrawingCanvas` — Pointer events, palette swatches resolved through tokens.css, thickness picker, undo, clear, locked-when-submitted; coords captured in logical canvas units so a phone sketch reads identically on a 4K host)
- [x] Drawing reveal grid + lightbox (`DrawingReveal` + `DrawingPreview` + `DrawingLightbox`; the grid is also rendered when the round is a Best-Answer round, with `VotePanel` swapping its text cards for `DrawingPreview` thumbnails and `RoundResult.BestAnswerReveal` doing the same for the de-anonymized tally)
- [x] Best-answer-mode wiring (already inherited via the shared `bestAnswerMode` chrome on every `DeckElement`; the player surface uses it via `VotePanel`'s Drawing-specific grid)
- [x] Stroke downsampling pre-submit (`downsampleStrokes` in `DrawingCanvas/drawingUtils.ts` — Douglas-Peucker with epsilon scaled to ¼ of stroke thickness; runs only on submit)
- [x] Frontend codegen + lint
- [x] Backend tests pass
