# Place-on-Image Slides

A **PLACE_ON_IMAGE slide** asks players to pin points on a backing image. It is
[Axis](../axis-slides/README.md)'s sibling — same normalized `[0, 1]`
coordinates, same tolerance-radius grading, with the image standing in for the
labeled plane. Axis's doc treats PLACE_ON_IMAGE as its model precedent; this
one covers what is specific to PLACE_ON_IMAGE.

**Status: implemented (v1)** — model, grader, authoring surface, and the whole
live pipeline (participant view, validation, board, pin tally, target reveal).
The only gap is the post-round results chart; see [Gaps](#gaps).

## Model

`PlaceOnImageContent(image, items, correctPositions, tolerance, scoreMode)` —
Axis's record minus the four endpoint labels, plus the backing `AppImage`.
`PlaceItem(id, label, image, color)` mirrors `AxisItem`, so the shared
`ItemField` row can label an item, override its palette color, or attach an
image. The answer key lives off the item entirely, in `correctPositions`
(itemId → `PlacePoint`): an item absent from it is authored but ungraded, and
an empty map is a collect-only slide. Items are always addressed **by id**,
never by array position. `scoreMode` is fixed to `INSIDE_RADIUS`.

**The origin differs from Axis.** Coordinates are screen-space over the image
box: `(0, 0)` is the image's **top-left**, y is *not* inverted. That is stated
once, as `invertY: false`, where the editor's surface calls the shared
placement kit — the stored point *is* the rendered point, so nothing between
the grader and the marker flips y.

The answer is `PlaceOnImageAnswer(Map<String, PlacePoint> placements)` — one
pin per authored item, not one pin per slide.
`RoundEvaluator.gradePlaceOnImage` mirrors `gradeAxis` exactly: all-or-nothing
over every keyed item, an unkeyed item ignored rather than failed.

## Live pipeline

- **Participant-safe view** — `PlaceOnImageConfigView` (`SlideView.placeOnImage`): the backing image's presigned `imageUrl` plus one `PlaceItemView(id, label, imageUrl, color)` per item. Never `correctPositions` or `tolerance`.
- **Validation** — `LiveSessionAnswerService.validatePlaceOnImage`, mirroring `validateAxis`: at least one placement, every key an item id on the slide, every point finite and in `[0, 1]`. Validation is against *existence*, not against being graded.
- **Resubmit** — the payload joins the [whole-answer resubmit override](../axis-slides/README.md#whole-answer-resubmit-override), so the backend accepts a resubmitted map. Freezing after the first submit is purely the board's own `lockOnSubmit: true` UI choice.
- **Live tally** — pins quantize into a **`PLACE_TALLY_BUCKETS = 20`** grid, finer than Axis/Scales' shared 10, since the scatter reads over a backing image. One `itemId@bx,by` key per placement; otherwise the same pipeline Axis's [live tally section](../axis-slides/README.md#live-tally--quantized-buckets) describes.
- **Reveal** — `ResultsRevealed.placeTargets`: one `PlaceTargetView(itemId, x, y, radius)` per keyed item, walking `items` in authored order so disclosure order matches the bank. Geometry only — label, color and image are already on the config view, so the board resolves them by `itemId`. The snapshot carries the same list for a client joining mid-reveal.

## Editor UX

`hooks/usePlaceOnImageEditor.ts` has the same shape as `useAxisEditor` — a
synthesized `question` view, `setImage`, id-addressed label/color/image ops from
the shared item bank, `setTolerance` (clamped `0.02`–`0.5`), and
`handleItemDragEnd`. Bounds: `MIN/MAX_PLACE_TARGETS = 1 / 6`,
`PLACE_TOLERANCE_MIN/MAX/DEFAULT = 0.02 / 0.5 / 0.1`, `PLACE_LABEL_MAX = 80`.

**One authoring gesture is genuinely different: `addTarget(point?)` has two
paths.** With a `point` (a press on the open image) it mints the item *and* its
answer-key entry in one updater, so the target is born placed. With no argument
(the bank's "Add target" card) it mints the item alone, **unplaced** — a target
that exists, is numbered and labelled, but keys no right answer.
`setTargetPosition(id, point | null)` gives or clears a point without removing
the item, resolved against the freshest draft so back-to-back writes can't race
and no entry is ever minted for a phantom item. `isPlaced(target)` is the
exported predicate the UI counts and branches on.

Two components are Place-on-Image's own; rows, markers, pointer bookkeeping,
tolerance field, two-column layout and composer state all come from the
[shared placement kit](../deck-editor/README.md#shared-placement-kit).

- **`PlaceOnImageSlideContent.tsx`** — an "Image" card (choose/replace + the surface) beside a "Targets" card (`ToleranceField` in the header, one `SortableItemBankRow` with `type="PLACEMENT"` per target). Row order drives each marker's number, so **reordering renumbers and nothing else** — each target owns its coordinates and its creation-minted color. The row's menu leads with "Set target" / "Clear target", the same toggle also exposed as the row's trailing check button. Header reads "N of M placed", with the tolerance field disabled while nothing is placed. Footer nudges (image, at least one target, a position on every target) are advisory — an unkeyed slide is still valid.
- **`PlaceOnImageSurface.tsx`** — a plain block `<img>` at its intrinsic aspect ratio, never letterboxed or stretched, so normalized overlay coordinates land where players would see them. Four behaviours worth knowing:
  - **An armed row always wins.** `pendingKey` returns the armed id before the sentinel, so a press places *that* target — which is also why an armed row still places at the target cap, where minting is closed.
  - **Committing auto-disarms**, so the next press adds rather than silently relocating the target just finished.
  - **An in-flight new placement has no id yet**, so it draws as a ghost `PlacementMarker` keyed on `PENDING_PLACEMENT_KEY` until release commits it via `addTarget`.
  - **Tolerance circles are sized off the image box's width at 1:1**, so they read as circles on a non-square image while the grading space stays normalized.
- **Image picking** passes `crop: { mode: "required", aspect: 1 }` (see [crop options](../image-cropping.md#gallerypicker-crop-options)) so the backing image is square before it reaches the surface.

## Board UX

`PlaceOnImageBoardContent.tsx` runs on the shared `useBoardPlacement` hook, the
same one [Axis's board](../axis-slides/README.md#board-ux) uses — same
drag-primary / tap-to-place / arrow-nudge model, parameterized here as
`invertY: false` and `lockOnSubmit: true`. Submit is gated on all items placed;
the button reads "Lock in answer" with no resubmit affordance.

On `liveResults`/`results` a density scatter fills in over the image — one dot
per occupied `itemId@bx,by` bucket, sized and opacity-scaled by share of the
busiest bucket. On `results` the authored target circles are disclosed from
`ResultsRevealed.placeTargets` (or the snapshot, for a late joiner), each drawn
as the exact normalized ellipse the grader accepts with a non-interactive
`MarkerBadge` at its centre, plus the viewer's own outcome banner. Projector
mode is image + scatter/reveal only.

## Gaps

- **No results chart.** `Charts/registry.ts` has `PLACE_ON_IMAGE: { supportedViz: ["IMAGE_OVERLAY", "HEATMAP", "NONE"], implemented: false }` — an image-aware renderer is still needed for the post-round view. The live board's scatter and target reveal already cover the in-session view; see [results-visualization](../results-visualization.md).
