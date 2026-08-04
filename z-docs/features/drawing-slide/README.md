# Drawing Slides

A **DRAWING slide** asks players to freehand-draw on a shared square canvas and
submit a rendered PNG. It is open-ended, so the Drawing round itself is
**never** graded — `RoundEvaluator.isCorrect` returns `false` for every
`DrawingAnswer`. Points, when there are any, are earned on a paired
[follow-up round](../follow-up-slides/README.md).

**Status: implemented end to end** — content model, authoring surface, the
live answer pipeline (upload + submit + resubmit), and the post-round results
gallery.

## Model

`DrawingContent(imagePrompt, promptPlacement, correctImage, palette, tools)`:

- **Canvas geometry is not part of the content.** The canvas is always 1:1; its logical resolution (`DRAWING_LOGICAL_SIZE = 1024`) is a frontend constant, never authored or sent over the wire.
- **`promptPlacement`** — `ALONGSIDE` (beside the canvas, a plain reference) or `BACKGROUND` (drawn under the strokes as a traceable layer, both on screen and in the export).
- **`correctImage`** — the author's own picture of the right answer. It changes nothing about the Drawing round (players never see it, and `DrawingConfigView` deliberately omits it), but a `SPOT_THE_ANSWER` follow-up seeds it onto its board, and carrying one is what makes the slide an eligible parent for that mode.
- **`Tool`** has five members — `PEN, ERASER, SHAPES, TEXT, COLOR_PALETTE` — but only four are wired. See [Gaps](#gaps).

The answer is `DrawingAnswer(AppImage image)` — a single **stored** image, not
raw stroke data. The drawing is rasterized client-side and ingested to S3
*before* the answer is submitted; the payload only ever references the stored
image.

## Follow-up pairing

A Drawing slide is `ScorableContent`, so it can carry a follow-up like any
other question. Two modes accept a `DRAWING` parent:

- **`BEST_ANSWER_VOTE`** — one candidate per submitted drawing, the room picks a favourite, the reveal badges the most-picked. It awards nothing: the pick grades a permanent `false`, so this is a working best-answer *presentation*, not a scored vote.
- **`SPOT_THE_ANSWER`** — valid only when the slide carries an authored `correctImage`. The mint seeds that picture among the submitted drawings, keyed on its stored `srcKey` like any of them and served through the same opaque URL, and the round **scores** both the pickers and the authors whose drawings drew picks. See [follow-up slides](../follow-up-slides/README.md#gotchas) for the seeding, the degradation when no image is authored, and why the picture itself — not any URL or id — is the one thing that can give the seed away.

## The shared canvas

`frontend/src/shared/components/DrawingCanvas/` is the one canvas used by the
editor (author draws a prompt), the live board (players draw their answer), and
anywhere else a drawing is produced. Three files: `drawingModel.ts` (pure data
model + 2D rendering, no React), `useDrawingCanvas.ts` (pointer lifecycle,
undo/redo history, PNG export), `DrawingToolbar.tsx` (presentational tool row).

All geometry lives in the fixed `DRAWING_LOGICAL_SIZE` space, independent of
on-screen CSS size and devicePixelRatio, so the visible canvas and the export
render the same element list through `renderElements` — **what the player sees
is exactly what gets submitted.** Two behaviours are easy to break and worth
knowing:

- **The background image has two independent load paths.** On-screen display prefers a CORS-clean (`crossOrigin="anonymous"`) load but falls back to a plain one — the visible canvas is never read back, so a tainting image is safe to *show*. PNG export always requires the CORS-clean copy and silently skips the background if it can't get one. That is what unblocks presigned-S3 backgrounds whose bucket lacks CORS headers.
- **`disabled` aborts cleanly mid-stroke.** An effect clears the active pointer and the draft and rolls back any in-progress eraser drag the instant `disabled` flips true, so a mid-stroke disable can't permanently strand the pointer gate and block all future strokes.

`DrawingCanvas` exposes an imperative `DrawingCanvasHandle`
(`exportPng`/`clear`/`isEmpty`) via `ref`, so the parent owns what happens to
the resulting blob rather than the canvas owning any submit logic.

## Editor UX

`hooks/useDrawingEditor.ts` sits over `useSlideEditor(deckId, slideId,
"DRAWING")`. Prompt-image ops (`setImagePrompt`/`clearImagePrompt`/
`setPromptPlacement`) and the `correctImage` equivalents are immediate; both
slots also offer `saveDrawnPrompt`/`saveDrawnCorrectImage`, which ingest a
canvas PNG into the author's personal gallery and slot the result. Palette
edits are debounced while dragging and immediate on structural changes, capped
at `MAX_DRAWING_PALETTE = 12`. `setToolEnabled` re-adds `PEN` on every write —
**`PEN` can never be removed.**

`SlideContent/DrawingSlideContent/` renders the prompt plus three cards:

- **"Prompt image"** — gallery picker (`cropWidth: 1, cropHeight: 1, cropGalleryPicks: true`, see [crop options](../image-cropping.md#gallerypicker-crop-options)), "Draw one" (a full `DrawingCanvas` in the global modal), and "Remove". A radio picks `ALONGSIDE` vs `BACKGROUND`.
- **"Correct answer image"** — the same three actions and the same 1:1 crop (the follow-up board shows it beside square canvas exports, so a different aspect ratio would itself be a tell). The card's hint says what it buys: it unlocks the "Spot the answer" mode, and it should be something that could pass for a player's drawing. **Remove is hidden while a keyed follow-up is attached** (`wouldOrphanKeyedFollowUp`) — the backend rejects that content transition and the slide PUT is fire-and-forget, so the block has to happen client-side. Replace stays available.
- **"Canvas tools"** — a `Toggle` per player-facing tool (`TOOL_TOGGLES`: Eraser, Shapes, Color palette). While `COLOR_PALETTE` is on, a `PaletteEditor` row is shown.

## Live session — draw and submit

Unlike every other kind, submitting a Drawing answer is **two requests**:

1. **Upload** — `POST /api/liveSessions/{id}/drawings` (multipart), guest-accessible at the same tier as `/answers` and `/join`. `LiveSessionAnswerService.storeDrawing` requires a live session and a roster participant, then calls `ImageIngestService.ingest(…, prefix)` with `drawing/{sessionId}/{participantId}/{uuid}` rather than the gallery's prefix.
2. **Submit** — `POST /api/liveSessions/{id}/answers` with a `DrawingAnswer` echoing that image. `validateDrawing` rejects anything whose `srcKey` isn't external-free *and* under **this participant's own** namespace — ruling out external URLs, gallery keys, another session's uploads, and notably **another participant's drawing**, since presigned URLs for other players' drawings leak at results reveal and must not be replayable as one's own in a later round.

Resubmitting overwrites (the [whole-answer resubmit
override](../axis-slides/README.md#whole-answer-resubmit-override)) and also
**deletes the superseded upload's S3 objects**
(`LiveSessionOrchestrator.deleteReplacedDrawing`), so unlimited "update
drawing" cycles can't grow storage unbounded.

`DrawingConfigView` carries a pre-resolved `imagePromptUrl` string rather than
an `AppImage`, because the STOMP/Redis fan-out mappers don't run the HTTP-side
presigning serializer and an embedded `AppImage` would leak raw S3 keys. It
**never carries `correctImage`**, and nothing on the parent round's path even
resolves that image — pinned by
`LiveSessionOrchestratorTest.theDrawingParentsOwnRoundStillNeverCarriesItsAnswerImage`.

`DrawingBoardContent.tsx` covers every moment, switched by `mode`. On `prompt`
and `liveResults` an interactive participant in an accepting phase gets the
full canvas (tools and palette derived from `config.tools`, prompt image
alongside or as the background) and can resubmit until the round locks — the
shared `canDraw` check is simply `mode !== "results"`. Everyone else sees the
prompt plus a phase-correct note; a `LOCKED` round still reports `mode ===
"prompt"`, so the round `phase` is what distinguishes closed-but-not-revealed
from a host projecting a still-open round. The canvas is **keyed by `slideId`**,
so navigating between rounds always starts fresh — its element and history
state is component-internal, never synced from the server mid-round.

## Results gallery

On reveal, a Drawing round's `ResultsRevealed` carries a nullable `drawings:
List<DrawingSubmissionView>` (`null` for every other slide type), built by
`LiveSessionOrchestrator.drawingSubmissions`: every stored `DrawingAnswer` for
the round, each image presigned at the **LG** (960px) tier, joined to the
participant's display name. The slide is looked up *tolerantly* — a missing
slide must not fail the whole reveal. Like `DrawingConfigView`, the image
travels as a pre-resolved string because the fan-out path skips the HTTP-side
serializer.

`DrawingBoardContent`'s `results` mode renders this as a 1:1 tile grid. It
bypasses the [results-visualization](../results-visualization.md)
`ChartDatum`/registry pipeline entirely — a dedicated event field and a
dedicated renderer, not a registry entry.

## Gaps

- **`Tool.TEXT` is declared but unimplemented.** The enum member exists (backend + generated frontend union) but nothing renders or offers a text tool — not the shared canvas, not the editor's `TOOL_TOGGLES`. A hand-edited `tools` set containing `"TEXT"` is silently ignored.
- **The Drawing round is a permanent `false`, by design.** Points are earned on the follow-up. `SPOT_THE_ANSWER` scores there; `BEST_ANSWER_VOTE` still awards nothing (see [follow-up → Deferred](../follow-up-slides/README.md#deferred)).
- **No post-round chart entry.** `DRAWING` is deliberately absent from `resultsRegistry` — its results are the gallery above.
