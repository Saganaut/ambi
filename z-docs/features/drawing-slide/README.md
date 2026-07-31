# Drawing Slides

A **DRAWING slide** asks players to freehand-draw on a shared square canvas
and submit a rendered PNG. It's a survey-style, open-ended kind — there is no
static answer key, so it's typically paired with a `BEST_ANSWER_VOTE`
[follow-up slide](../follow-up-slides/README.md) to let the room pick a
favorite from the round's submissions.

**Status: implemented end to end.** Content model, authoring surface, the
live-session answer pipeline (upload + submit + resubmit), and the post-round
results gallery are all built. A `BEST_ANSWER_VOTE` follow-up now runs a full
live round on a Drawing parent's submissions too (see
[Grading / follow-up](#grading--follow-up)) — but a Drawing round is still
graded `correct = false` regardless: v1 never turns a follow-up's picks into
points, so pairing a Drawing slide with a follow-up gets you a working
"most-picked" presentation, not a scored round.

## Model

`presentation/slide/content/DrawingContent.java`:

```java
public record DrawingContent(
    AppImage imagePrompt,       // optional prompt image shown with the canvas
    PromptPlacement promptPlacement,  // ALONGSIDE | BACKGROUND
    AppImage correctImage,      // reserved for a future compare/vote feature — NOT surfaced in the editor
    List<String> palette,       // author-configured stroke colors offered to players
    Set<Tool> tools             // PEN | ERASER | SHAPES | TEXT | COLOR_PALETTE
) implements ScorableContent {
  @Override public SlideType contentType() { return SlideType.DRAWING; }
}
```

- **Canvas geometry is not part of the content.** The canvas is always a
  fixed 1:1 square; its logical resolution
  (`DRAWING_LOGICAL_SIZE = 1024`, in
  `frontend/src/shared/components/DrawingCanvas/drawingModel.ts`) is a
  frontend constant, not authored or sent over the wire.
- **`promptPlacement`** decides where the optional prompt image appears:
  `ALONGSIDE` (beside the canvas, a plain reference) or `BACKGROUND` (drawn
  under the strokes as a traceable layer, both on screen and in the export).
- **`correctImage`** exists on the wire for a future compare/vote feature and
  is deliberately not surfaced in the editor — see [Status / gaps](#status--gaps).
- **`Tool`** (`presentation/slide/enums/Tool.java`) has five members —
  `PEN, ERASER, SHAPES, TEXT, COLOR_PALETTE` — but only four are wired end to
  end. `TEXT` is declared on the enum with no implementation anywhere in the
  shared canvas or the editor's tool toggles; see
  [Status / gaps](#status--gaps).

### Answer payload

`session/answer/payload/DrawingAnswer.java` — a single stored image, not raw
stroke data:

```java
public record DrawingAnswer(AppImage image) implements AnswerPayload {
  @Override public SlideType slideType() { return SlideType.DRAWING; }
}
```

The participant's drawing is rasterized to a PNG client-side and ingested to
S3 *before* the answer is submitted — the payload only ever references the
stored image, never inline image data. See
[Live session — draw and submit](#live-session--draw-and-submit) for the
upload step this depends on.

## Grading / follow-up

`RoundEvaluator.isCorrect` grades every `DrawingAnswer` `false` — Drawing has
no static answer key, same as `FollowUpAnswer`, `QAndAAnswer`, and
`QAndAQuestions`. A Drawing slide is still `ScorableContent` (so
`isScorableSlideType`/`canHaveFollowUp` treat it like any other question, and
it *can* carry a follow-up), but nothing scores the drawing itself without
one. `FollowUpMode.BEST_ANSWER_VOTE` lists `DRAWING` as a valid parent type
(as does every other scorable slide type) — see
[follow-up slides](../follow-up-slides/README.md#modes) — and its
live-session runtime is built: the follow-up round mints one candidate per
submitted drawing, participants pick their favorite, and the reveal badges the
most-picked drawing(s). What it doesn't do is award points — a follow-up pick
always grades `false` (see
[follow-up slides § Runtime](../follow-up-slides/README.md#runtime)) — so
pairing a Drawing slide with a follow-up today gets you a fully working
best-answer *presentation*, not a scored vote.

## Shared component — `DrawingCanvas`

`frontend/src/shared/components/DrawingCanvas/` is the one canvas used by the
deck editor (author draws a prompt), the live-session board (players draw
their answer), and anywhere else a drawing is produced. Three files split the
concerns:

- **`drawingModel.ts`** — pure data model + 2D rendering, no React. All
  geometry lives in the fixed `DRAWING_LOGICAL_SIZE × DRAWING_LOGICAL_SIZE`
  logical space, independent of on-screen CSS size or devicePixelRatio, so
  the visible canvas and the PNG export render the same element list through
  `renderElements` — what the player sees is exactly what gets submitted.
  Elements are a discriminated union: `PenElement` (a
  [perfect-freehand](https://github.com/steveruizok/perfect-freehand)
  pressure-tapered outline, `simulatePressure` kicking in for
  mouse/touch's constant 0.5 pressure) and `ShapeElement` (`line` / `rect` /
  `ellipse`, drag-to-size outline strokes). `hitTestElement` (distance-to-ink,
  including an approximated ellipse-outline probe) backs the eraser.
- **`useDrawingCanvas.ts`** — pointer lifecycle, undo/redo history (100-step
  cap, `HISTORY_LIMIT`), live redraw, background-image loading, and PNG
  export:
  - **Single active pointer.** `activePointerRef` is claimed on
    `pointerdown` and enforced on every subsequent handler, so a second
    contact (e.g. a resting palm) can't commit or wipe the primary pointer's
    in-progress stroke.
  - **In-progress strokes live in a ref**, not React state, and redraw on
    `requestAnimationFrame` ticks — state only changes once a stroke commits
    (pointer-up), keeping drawing smooth.
  - **Whole-element eraser** — one undo step per drag, not per hit; a
    cancelled drag (pointer-cancel) rolls back to its pre-drag snapshot
    instead of dropping it, so a cancelled erase can't bake a half-applied
    removal into history as an un-undoable mutation.
  - **`disabled` aborts cleanly mid-stroke** — an effect clears
    `activePointerRef`/the draft and rolls back any in-progress eraser drag
    the instant `disabled` flips true, so a mid-stroke disable can't
    permanently strand the pointer gate and block all future strokes.
  - **Background image has two independent load paths.** On-screen display
    prefers a CORS-clean (`crossOrigin="anonymous"`) load but falls back to a
    plain load if that fails — the visible canvas is never read back, so a
    tainting image is safe to *show*. PNG export always requires the
    CORS-clean copy and silently skips the background if it can't get one.
    This unblocks presigned-S3 backgrounds whose bucket lacks CORS headers.
  - **`exportPng` only includes committed strokes** — a stroke whose pointer
    is still down is never in the export.
- **`DrawingToolbar.tsx`** — presentational tool row: pen/eraser/shape
  pickers (gated by `allowEraser`/`allowShapes` props), palette swatches
  (hidden when the palette is empty), three brush sizes (`BRUSH_SIZES`:
  fine/medium/bold), undo/redo/clear.

`DrawingCanvas` exposes an imperative `DrawingCanvasHandle`
(`exportPng`/`clear`/`isEmpty`) via `ref`, so the parent owns what happens to
the resulting blob (gallery ingest, answer upload, …) rather than the canvas
owning any submit logic. A `disabled` prop hides the toolbar and — per the
lifecycle handling above — ignores input while still letting an in-flight
stroke clean itself up.

Also shipped: Storybook stories
(`DrawingCanvas.stories.tsx`) and vitest unit tests for the `drawingModel.ts`
hit-test geometry (`drawingModel.test.ts` — pen, line, rect, ellipse).

## Editor UX

### Hook — `useDrawingEditor.ts`

Over the generic `useSlideEditor(deckId, slideId, "DRAWING")`:

- Synthesized `question` view (`prompt` from `slide.title`, `imagePrompt`,
  `promptPlacement`, `palette`, `tools`).
- Prompt image: `setImagePrompt`/`clearImagePrompt` (immediate),
  `setPromptPlacement` (immediate), and `saveDrawnPrompt(blob)` — the
  "draw your own prompt" path: ingests the canvas PNG into the author's
  personal gallery (`useUploadImageMutation`) and slots the result as
  `imagePrompt`. Throws if the personal gallery hasn't loaded yet.
- Palette: `schedulePalette` (debounced, live color-picker drags) /
  `commitPalette` (immediate, structural edits), both capped at
  `MAX_DRAWING_PALETTE = 12`.
- Tools: `setToolEnabled(tool, enabled)` — **`PEN` can never be removed**;
  every write re-adds it to the tool set regardless of what was toggled off.

### Components — `SlideContent/DrawingSlideContent/`

- **`DrawingSlideContent.tsx`** — prompt at the top (stored on `slide.title`,
  like TEXT/MCQ), then two cards:
  - **"Prompt image"** — "Choose image" (gallery picker, `cropWidth: 1,
    cropHeight: 1, cropGalleryPicks: true` so the prompt image is square
    before it reaches the 1:1 canvas — see the
    [Place-on-Image doc](../place-on-image/README.md#gallerypicker-crop-options)
    for the picker's crop options), "Draw one" (opens `DrawPromptModalBody` in
    the global modal — a full `DrawingCanvas` with shapes enabled, "Use
    drawing" ingests the export and sets it as the prompt), and "Remove"
    once an image exists. A radio (disabled until an image exists) picks
    `ALONGSIDE` vs `BACKGROUND`.
  - **"Canvas tools"** — a `Toggle` per player-facing tool: Eraser, Shapes,
    Color palette (`TOOL_TOGGLES` — note `TEXT` has no toggle here, matching
    the shared component's gap above). While `COLOR_PALETTE` is on, a
    `PaletteEditor` row (swatch-per-color, native color-picker inputs, a
    trash icon per swatch, a dashed "+" add tile hidden once the palette
    hits its cap) is shown.
  - `correctImage` is intentionally not surfaced anywhere in this surface.

### Registration

- `slideContent.ts` — `buildDefaultContent` case `"DRAWING"`: no image
  prompt, `promptPlacement: "ALONGSIDE"`, `palette:
  [...DEFAULT_DRAWING_PALETTE]` (6 starting swatches), `tools: ["PEN",
  "ERASER", "COLOR_PALETTE"]` (Shapes off by default).
- `SlideDisplay.tsx` — `case "DRAWING"`; `NewSlideModal` —
  `SLIDE_TYPE_LABELS.DRAWING: "Drawing"` (a normal, always-creatable tile —
  not `HIDDEN_SLIDE_TYPES`, unlike `FOLLOW_UP`); a `slideTypeGraphics` tile;
  one `deckMockData.ts` fixture.

## Live session — draw and submit

Unlike every other question kind, submitting a Drawing answer is **two
requests**: upload the rendered PNG, then submit the `DrawingAnswer` that
references it.

1. **Upload** — `POST /api/liveSessions/{id}/drawings` (multipart,
   `LiveSessionController.uploadDrawing`), guest-accessible
   (`SecurityConfig` grants `hasRole("GUEST")`, same tier as `/answers` and
   `/join`). `LiveSessionAnswerService.storeDrawing`: session must be live,
   caller must resolve to a roster participant, then
   `ImageIngestService.ingest(bytes, contentType, null, prefix)` — the
   **prefix-parameterized overload** — stores it under
   `drawing/{sessionId}/{participantId}/{uuid}` rather than the gallery's
   `gallery/{uuid}`. Returns the stored, presigned `AppImage`.
2. **Submit** — `POST /api/liveSessions/{id}/answers` with a `DrawingAnswer`
   echoing that image. `validateDrawing` rejects anything whose `srcKey`
   isn't external-free *and* prefixed with this participant's own
   `drawing/{sessionId}/{participantId}/` namespace — ruling out external
   URLs, gallery keys, another session's uploads, and (notably) **another
   participant's drawing**, since presigned gallery-style URLs for other
   players' drawings leak at [results reveal](#results-gallery) time and
   must not be replayable as one's own in a later round.
3. **Resubmit overwrites.** `DrawingAnswer` is one of the payload kinds
   forced to `maxSelections = 0` on submit (alongside Grid/Axis/Scales/
   Matching) — a submission is one whole artifact, not an MCQ-style
   incremental pick, so the deck's `maxSelections` default must not make the
   first draw final. Resubmitting also **deletes the superseded upload's S3
   objects** (`LiveSessionOrchestrator.deleteReplacedDrawing`, a private
   method called from `submitAnswer`, mirroring `GalleryService`'s
   delete-on-remove) so unlimited "update drawing" cycles can't grow storage
   unbounded.

### Participant-safe config — `DrawingConfigView`

`SlideView.from(...)` builds a `DrawingConfigView` for a `DrawingContent`
slide: pre-resolved `imagePromptUrl` (a plain string, not an `AppImage` —
the STOMP/Redis fan-out mappers don't run the HTTP-side presigning
serializer, so an embedded `AppImage` would leak raw S3 keys; same reasoning
as `MatchingConfigView`), `promptPlacement`, `palette`, `tools`. **Never
carries `correctImage`.**

### Board — `DrawingBoardContent.tsx`

One component covers every moment, switched by `mode`
(`resolveBoardStage.ts`'s `BoardQuestionMode`, which has three values —
`"prompt" | "liveResults" | "results"`):

- **`prompt`** (round open) — a participant with `interactive` and an
  accepting phase (`SUBMIT`/`SUBMIT_LIVE`) gets the full `DrawingCanvas`:
  tools/palette straight from `config` (`allowEraser`/`allowShapes` derived
  from `config.tools`; palette forced empty unless `COLOR_PALETTE` is
  enabled), prompt image beside the canvas (`ALONGSIDE`) or as
  `backgroundImageUrl` (`BACKGROUND`, traceable). Submit exports the canvas
  to a PNG, uploads it (`uploadDrawing`), then `sendAnswer` with a
  `DrawingAnswer`. The button flips to "Update drawing" after a successful
  submit — resubmitting is allowed until the round locks. Host/projector,
  and everyone once the round is `LOCKED`, see the prompt image plus a
  phase-correct note instead (`mode` stays `"prompt"` for a locked round —
  the round `phase` is what tells a closed-but-not-revealed round apart from
  a host projecting a still-open one).
- **`liveResults`** — the same still-answerable canvas surface as `prompt`
  (drawing input isn't locked yet); `DrawingBoardContent` treats it
  identically to `prompt` via the shared `canDraw` check (`mode !==
  "results"`). Since `DrawingAnswer` is forced to `maxSelections = 0`,
  resubmitting during `liveResults` overwrites the prior submission, same as
  during `prompt`.
- **`results`** — everyone (host, projector, every participant) sees the
  same [results gallery](#results-gallery); the canvas is gone.
- The canvas is **keyed by `slideId`**, so navigating between rounds always
  starts a fresh drawing — its element/history state is entirely
  component-internal, not synced from the server mid-round.

## Results gallery

On `revealResults`, a Drawing round's `ResultsRevealed` event carries a
nullable `drawings: List<DrawingSubmissionView>` — `null` for every other
slide type. `LiveSessionOrchestrator.drawingSubmissions`:

- Looks up the round's slide **tolerantly** — a missing slide must not fail
  the whole reveal.
- Reads every stored `Answer` for the round from `AnswerStore`, keeping only
  `DrawingAnswer`s with a non-null image.
- Resolves each image to a presigned URL at the **LG** (960px-bound) size
  tier via `ImageUrlResolver` — big enough to stay crisp on a gallery tile,
  smaller than the original.
- Joins each participant's display name from the roster.

`DrawingSubmissionView(participantId, displayName, imageUrl)` — like
`DrawingConfigView`, the image travels as a pre-resolved string because the
STOMP fan-out path skips the HTTP-side presigning serializer.

`DrawingBoardContent`'s `results` mode renders this as a 1:1 tile grid — one
`<img>` + the player's name per submission, "No drawings were submitted this
round" when the gallery is empty. This bypasses the
[results-visualization](../results-visualization.md) `ChartDatum`/registry
pipeline entirely (same shape of exception as the live Q&A word cloud): it's
a dedicated event field and a dedicated board renderer, not a
`resultsRegistry` entry, an adapter, or a `ResultsDisplaySwitch` case.

## Status / gaps

- **`Tool.TEXT` is declared but unimplemented.** The enum member exists
  (backend + generated frontend union) but nothing renders or offers a text
  tool anywhere — not the shared `DrawingCanvas`/`DrawingToolbar`, not the
  editor's `TOOL_TOGGLES`. A slide's `tools` set can still contain `"TEXT"`
  if hand-edited (e.g. via the API), but the canvas silently ignores it.
- **`correctImage` has no consumer.** The field exists on `DrawingContent`
  and round-trips through persistence/generated types, but nothing reads it
  — no editor UI, no grading, no compare view. It's reserved for a future
  compare/vote feature per its Javadoc.
- **Grading is a permanent `false`, not a gap to close directly.** A
  `BEST_ANSWER_VOTE` follow-up (see [Grading / follow-up](#grading--follow-up))
  runs a full live round on a Drawing parent's submissions, but v1's
  follow-up runtime never awards points — see
  [Missing Features](../missing-features.md) for the scoring modes that
  would change that. Until then, a Drawing round only ever collects
  drawings, and a follow-up only ever surfaces the most-picked one; nothing
  turns either into a score.
- **No post-round chart entry.** `DRAWING` is deliberately absent from
  `resultsRegistry` (`Charts/registry.ts`) — its results are the dedicated
  gallery above, not a `ChartDatum` visualization — see
  [results-visualization](../results-visualization.md#chart-fit-matrix).

## Related

- [Follow-Up Slides](../follow-up-slides/README.md) — `BEST_ANSWER_VOTE`
  pairing and runtime, and what's still missing to actually score a Drawing
  round.
- [Place-on-Image Slides](../place-on-image/README.md) — the
  `GalleryPicker` crop options Drawing's prompt-image picker shares (both now
  crop to 1:1 via `cropWidth`/`cropHeight` + `cropGalleryPicks`).
- [Results Visualization](../results-visualization.md) — why Drawing's
  gallery bypasses the `ChartDatum`/registry pipeline.
- [Media & Gallery](../../diagrams/media-gallery.md) — the
  `ImageIngestService`/`ImageKeys` machinery Drawing's prefix-parameterized
  uploads share with the gallery.
