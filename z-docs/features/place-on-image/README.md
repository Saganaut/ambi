# Place-on-Image Slides

A **PLACE_ON_IMAGE slide** asks a player to pin a single point on a backing
image; it's [Axis](../axis-slides/README.md)'s sibling — same normalized
`[0, 1]` coordinate and radius conventions, minus the labeled plane, with the
image standing in for the plane. Axis's README treats PLACE_ON_IMAGE as its
model precedent; this doc covers the parts specific to PLACE_ON_IMAGE itself.

**Status: implemented (v1).** The content model, grader, and authoring surface
landed first; the live-session side — participant-safe config view, answer
validation, live board, and pin tally — landed afterwards (`c3615da`, "add
live place-on-image board"). A PLACE_ON_IMAGE slide can be authored in the
deck editor and played in a live session end to end. Only the post-round
results chart remains unbuilt (see [Status / gaps](#status--gaps) below).

## Model

`presentation/slide/content/PlaceOnImageContent.java`:

```java
public record PlaceOnImageContent(
    AppImage image,                        // the backing image players pin on
    List<PlaceItem> items,                 // the items players place; one pin each
    Map<String, PlacePoint> correctPositions, // itemId → target; the answer key — NEVER sent to clients
    double tolerance,                      // normalized radius, one knob per slide
    ScoreMode scoreMode                    // fixed INSIDE_RADIUS; no authoring knob
) implements ScorableContent {
  @Override public SlideType contentType() { return SlideType.PLACE_ON_IMAGE; }
}
```

This is now [Axis](../axis-slides/README.md)'s model precedent exactly, minus
the labeled plane: `PlaceItem(String id, String label, AppImage image, String
color)` (`SlideContentTypes.java`) mirrors `AxisItem` — the same optional
author annotations, so the editor's shared `ItemField` row control (see
[Editor UX](#editor-ux) below) can label an item, override its palette color,
or attach an image — and the answer key lives off the item entirely, in
`correctPositions` (itemId → `PlacePoint`), never on the item itself. An item
absent from `correctPositions` is authored but ungraded; an empty map is a
collect-only slide. Items are always addressed **by id** (never by array
position) — see [Hook](#hook--useplaceonimageeditorts).

Coordinates are screen-space over the image box: **`(0, 0)` is the image's
top-left corner**, y is *not* inverted — the opposite of Axis's bottom-left
origin. `RoundEvaluator.gradePlaceOnImage`, the editor's placement surface,
and the answer payload all measure in this same space. That origin is stated
once, as `invertY: false`, where the editor's surface calls the shared
placement kit — the stored point *is* the rendered point, so nothing between
the grader and the marker flips y.

### Answer payload

`session/answer/payload/PlaceOnImageAnswer.java` — a per-item map, like
Axis's `AxisAnswer` (one pin per authored item, not one pin per slide):

```java
/** Placement of each item id at a normalized (0..1) pin on the image. */
public record PlaceOnImageAnswer(Map<String, PlacePoint> placements) implements AnswerPayload {
  @Override public SlideType slideType() { return SlideType.PLACE_ON_IMAGE; }
}
```

`PlacePoint(double x, double y)` (`SlideContentTypes.java`) is
Place-on-Image's own point record — structurally identical to Axis's
`AxisPoint`, and serves the same dual role: it's both the authored answer key
(`correctPositions`) and the runtime placement (`PlaceOnImageAnswer.placements`).

## Grading

`RoundEvaluator.gradePlaceOnImage` mirrors `gradeAxis`'s loop-over-answer-key
exactly: every keyed item's pin must land within the slide's `tolerance` of
its target.

```java
private static boolean gradePlaceOnImage(PlaceOnImageContent content, PlaceOnImageAnswer answer) {
    if (content.scoreMode() != ScoreMode.INSIDE_RADIUS
            || content.correctPositions() == null || content.correctPositions().isEmpty()
            || answer.placements() == null) {
        return false;
    }
    for (Map.Entry<String, PlacePoint> e : content.correctPositions().entrySet()) {
        PlacePoint placed = answer.placements().get(e.getKey());
        if (placed == null || Math.hypot(placed.x() - e.getValue().x(),
                placed.y() - e.getValue().y()) > content.tolerance()) {
            return false;
        }
    }
    return true;
}
```

- **All-or-nothing over every keyed item** — a missing or off-target pin for
  any one keyed item fails the whole round, the same single
  `ParticipantOutcome.correct` boolean shape Axis uses. An item with no
  `correctPositions` entry is ignored, not failed.
- **`INSIDE_RADIUS` is the only implemented mode** — `NEAREST` and `DISTANCE`
  are declared on `ScoreMode` but return `false` across `RoundEvaluator` today,
  same as Axis.
- **A target-less slide is legitimate collect-only** — an empty
  `correctPositions` map always grades `false`, making the slide an unscored
  "drop a pin" prompt (the Scales/Axis collect-only convention).

## Live pipeline

### Participant-safe view

`session/event/dto/PlaceOnImageConfigView.java`, wired as `SlideView.placeOnImage`:
the backing image's presigned `imageUrl` plus one `PlaceItemView(id, label,
imageUrl, color)` per authored item — never `correctPositions` or
`tolerance`, which stay the answer key until reveal.

### Answer validation

`LiveSessionAnswerService.validatePlaceOnImage`, mirroring `validateAxis`: at
least one item placed, every placement key one of the slide's item ids,
every point finite and within `[0, 1]`. Validation is against existence, not
against being graded — an unkeyed item is still a valid placement target.
`PlaceOnImageAnswer` also joins the
whole-map resubmit override (`effectiveMaxSelections = 0`) alongside
`GridAnswer`/`AxisAnswer`/`ScalesAnswer`/… — the backend itself accepts a
resubmitted map; it is only `PlaceOnImageBoardContent`'s own
`lockOnSubmit: true` that freezes the UI after the first submit (see
[Board UX](#board-ux)).

### Live tally — quantized buckets

`AnswerTallyKeys` quantizes each pin into a **`PLACE_TALLY_BUCKETS = 20`**
bucket grid (finer than Axis/Scales' shared 10-bucket resolution, since the
scatter reads over a backing image), one `itemId@bx,by` key per placement —
otherwise the same `@`-separator / `TallyStore` / resubmit-reconciliation
pipeline Axis's [live tally section](../axis-slides/README.md#live-tally--quantized-buckets)
describes.

### Reveal

`ResultsRevealed.placeTargets` (`session/event/dto/PlaceTargetView.java`) — one
`PlaceTargetView(itemId, x, y, radius)` per item that carries a
`correctPositions` entry, walking `items` in authored order so disclosure
order matches the bank; an unkeyed item has no circle. Geometry only — the
item's label, color and image are already on the participant-safe
`PlaceOnImageConfigView`, so the board resolves them by `itemId` rather than
re-receiving them here. Disclosed only once the round enters results. The
snapshot service carries the same list for a client that joins mid-reveal.

## Editor UX

### Hook — `usePlaceOnImageEditor.ts`

Over the generic `useSlideEditor(deckId, slideId, "PLACE_ON_IMAGE")`, the same
`items` + id-keyed `correctPositions` + slide-level `tolerance` shape as
`useAxisEditor.ts`, with one authoring-gesture difference (below):

- Synthesized `question` view (`prompt` from `slide.title`, `image`,
  `targets`, `tolerance`) — `targets` folds each item's `correctPositions`
  entry into the item view (`x`/`y` present when keyed, absent when not);
  debounced `schedulePrompt`.
- `setImage(image)` — immediate; swaps the backing image.
- **`addTarget(point?)` has two paths** — with a `point` (a press on the open
  image) it mints the item AND its answer-key entry in one updater, so the
  target is born placed; with no argument (the bank's "Add target" card) it
  mints the item alone, **unplaced** — a target that exists, is numbered and
  labelled, but keys no right answer and so is not graded. Either way the
  `PlaceItem` comes from `buildDefaultPlaceItem`.
  `setTargetPosition(targetId, point | null)` gives an item its target
  (clamped to `[0, 1]`) or clears it again, leaving the item in the bank; a
  stale id is a no-op, resolved against the freshest draft so back-to-back
  writes in one debounce window can't race, and no entry is ever minted for a
  phantom item. `removeTarget(targetId)` filters `items` and drops the
  `correctPositions` key together. `isPlaced(target)` is the exported
  predicate the UI counts and branches on.
- Author-annotation ops are the shared item-bank ops, id-addressed and
  re-exposed under Place-on-Image's names: `scheduleTargetLabel(targetId,
  label)` (debounced), `setTargetColor(targetId, color)` and
  `setTargetImage(targetId, image)` (both immediate).
- **`setTolerance(value)`** — one field, `content.tolerance` (clamped
  `0.02`–`0.5`, i.e. 2–50 %), the same single per-slide knob Axis writes; there
  is no per-target radius to keep in lockstep.
- `handleItemDragEnd` — the shared bank's handler, splicing `items` on a row
  drop (Axis's reorder shape, now literally the same code); it moves display
  order only, since the answer key is id-keyed and each item owns its own
  color.
- Constants: `MIN_PLACE_TARGETS = 1` (the last row stays — `canRemove`, and so
  `removeTarget`, is inert at the floor), `MAX_PLACE_TARGETS = 6` (one per
  shared palette color, matching Axis's item cap),
  `PLACE_TOLERANCE_MIN/MAX/DEFAULT = 0.02 / 0.5 / 0.1`,
  `PLACE_LABEL_MAX = 80` (mirrors `AXIS_LABEL_MAX`).

### Components — `SlideContent/PlaceOnImageSlideContent/`

Only two components are Place-on-Image's own; the rows, markers, pointer
bookkeeping, tolerance input, two-column layout, and composer state all come
from the **shared placement kit** (`SlideContent/_shared/placement/`) that
Axis, Place-on-Image, and Grid build on — see
[Axis's README](../axis-slides/README.md) for the kit's inventory.

- `PlaceOnImageSlideContent.tsx` — mirrors `AxisSlideContent`'s side-by-side
  `SettingsCard` layout (the shared `.editorRow` / `.editorColumnWide` /
  `.editorColumnNarrow` classes): an "Image" card (choose/replace button +
  the placement surface) and a "Targets" card (the shared `ToleranceField` in
  the header, one `SortableItemBankRow` (`type="placement"`) per target,
  add/remove). The rows are
  **draggable by their grip**, wrapped in a `DragDropWrapper` like Axis's and
  Grid's banks: row order drives each marker's number, so reordering is how an
  author renumbers the set — and renumbering is all it does. Each target owns
  its coordinates and the color minted for it at creation
  (`nextPaletteColor`, backfilled for legacy targets by
  `useItemIdentityBackfill` on load), so no marker moves or changes hue
  (`usePlaceOnImageEditor`'s `handleItemDragEnd` splices `items` by
  index — positional rather than id-addressed, because a drop only ever states
  "the row at this position moved to that one"). Each row wraps the shared
  `ItemField` — the label doubles as the popover trigger, and the menu holds
  the shared color palette/custom-color modal, image upload/clear, and delete,
  led by the `placement` arm's own action, not a composer-passed one: **"Set target"** seeds the surface's
  centre and **"Clear target"** drops the point again (Axis's pair — the
  pointer-free placement path). The same toggle is on the row itself as the
  trailing check / question-mark button, since an unplaced target is exactly an
  unscored one. The row shows an image thumbnail when the target has one, and
  is `scored` only once it carries a point. The card header reads
  **"N of M placed"** (Axis's counter), with the `ToleranceField` disabled
  while nothing is placed — there is no circle to size yet.
  `useSlideComposerState` holds the prompt mirror, which row's menu is open and
  which row is **armed** (at most one each: a row click arms it, opening its
  menu arms it too, and removing an armed row clears the selection); every
  other callback addresses its target by `target.id`. Advisory (non-blocking)
  footer nudges for an image, for at least one target, and for a position on
  every target — an unkeyed slide is still valid.
- `PlaceOnImageSurface.tsx` — the placement surface: a plain block `<img>` at
  its intrinsic aspect ratio (never letterboxed/stretched), so the normalized
  overlay coordinates land exactly where players would see them. The image
  box, the image, and the no-image 16:9 stand-in are all this file's own CSS;
  the surface chrome and pointer machinery are the kit's `.surface` /
  `.surfaceArmed` and `usePlacementSurface({ invertY: false, … })`. A press
  means one of two things and **an armed row always wins** (`pendingKey`
  returns the armed id before the sentinel): with a row armed the press places
  THAT target via `onSetTargetPosition` and then **auto-disarms** it (the
  commit calls `onToggleSelect` back), so the next press adds rather than
  silently relocating the target just finished — which is also why an armed row
  still places at the target cap, where minting is closed. With nothing armed,
  the press drops a new target and keeps dragging it; release commits via
  `addTarget`. Because that target has no id until it commits, the in-flight
  placement is drawn as a **ghost** `PlacementMarker`, keyed on the hook's
  `PENDING_PLACEMENT_KEY` sentinel. Placed markers drag directly (pointer
  capture) and commit through `onSetTargetPosition(targetId, point)`, and a tap
  on one toggles its row's arming (`onMarkerTap`, Axis's gesture). An unplaced
  target draws no marker at all until it is armed and dragged, when the live
  drag point materializes one. Markers are the shared
  `PlacementMarker` in the target's resolved color
  (`resolveDatumColor(target.color, index)` — the authored override when set,
  else the shared 6-color palette by index): a labeled target grows a label
  pill next to its numbered dot — the dot, not the pill, stays centred on the
  graded point — and each marker draws its tolerance circle sized off the
  image box's width with a 1:1 aspect ratio, so it reads as a circle on a
  non-square image while the grading space stays the normalized one.
- Image picking passes `cropWidth: 1, cropHeight: 1, cropGalleryPicks: true`
  (see [below](#gallerypicker-crop-options)) — matching the slide-option
  image slots — so the backing image is square before it ever reaches the
  placement surface: an upload is cropped on the way in, and a gallery-tab
  pick is re-cropped and stored as a new gallery image rather than inserted
  as-is.

### Registration

- `slideContent.ts` — `buildDefaultContent` case `"PLACE_ON_IMAGE"`: minimal
  `{ external: true }` placeholder image, empty `items` and
  `correctPositions`, `tolerance: 0.1`, `scoreMode: "INSIDE_RADIUS"`.
- `SlideDisplay.tsx` — `case "PLACE_ON_IMAGE"`; `NewSlideModal` —
  `SLIDE_TYPE_LABELS.PLACE_ON_IMAGE: "Place on Image"`; a `slideTypeGraphics`
  tile; one `deckMockData.ts` fixture.

## Board UX

`PlaceOnImageBoardContent.tsx` (+ module.css + test) in
`SessionBoard/content/`, wired as `case "PLACE_ON_IMAGE"` in
`BoardQuestion.tsx`. One component serves participant and projector via the
established `mode`/`interactive` props (the `AxisBoardContent` pattern).

- **Drag primary, tap-to-place fallback**, identical interaction model to
  Axis: a bank of `DraggableChip` buttons (seeded shuffle by slide id via the
  shared `content/seededShuffle.ts`) drags onto the `PlacementSurface` (the
  backing `<img>`) or taps to hold-then-tap-to-place; arrow keys nudge a
  focused placed pin. All of this — the round-local `Record<itemId, {x, y}>`
  draft, held/submitted state, and drag/tap/nudge handling — lives in the
  shared `useBoardPlacement` hook (`content/useBoardPlacement.ts`), the same
  one Axis runs on (see [its README](../axis-slides/README.md#board-ux)),
  parameterized here as `invertY: false` (the image's top-left origin, unlike
  the Axis plane's bottom-left) and `lockOnSubmit: true` — a **UI** decision:
  the backend accepts a resubmitted map like Axis does (see
  [Answer validation](#answer-validation)), but the board freezes the surface
  once the whole map is locked in rather than offering an "Update answer"
  affordance.
- Submit is gated on all items placed; `sendAnswer(slideId, { answerType:
  "PlaceOnImageAnswer", placements })`; the button reads "Lock in answer" and
  the confirmation note "Answer locked in ✓" (`BoardSubmitBar`, one-shot shape
  — no `resubmitLabel`).
- **liveResults / results**: a density scatter — one dot per occupied
  `itemId@bx,by` tally bucket (`content/answerTally.ts`'s
  `tallyTotalsByBucket`, `PLACE_TALLY_BUCKETS`), sized/opacity-scaled by share
  of the busiest bucket — fills in over the image; a participant who hasn't
  locked in may still place pins. On `results`, the authored target circles
  are disclosed from `ResultsRevealed.placeTargets` (or the snapshot's copy
  for a late joiner): each drawn as the exact normalized ellipse the grader
  accepts, with a non-interactive `MarkerBadge` at its centre (the badge's own
  published `.anchored`/`.anchoredLabeled` classes keeping the DISC, not the
  pill, on the target point) — plus the viewer's own outcome banner
  (`OutcomeBanner`/`findViewerOutcome`, `content/viewerOutcome.ts`) from the
  round result.
- **Projector** (non-interactive): image + scatter/target-reveal only.

## GalleryPicker crop options

The shared `useGalleryPicker` → `GalleryPicker` → `UploadTab` →
`ImageCropEditor` chain exposes three independent knobs to a caller:

- **`cropWidth` / `cropHeight`** — sets the Upload tab's crop box to that
  fixed ratio (default 16:9 when a caller gives neither). PLACE_ON_IMAGE's
  backing image and `DrawingSlideContent.tsx`'s prompt-image picker both pass
  `cropWidth: 1, cropHeight: 1`, same as the slide-option thumbnails, since
  all three slots render onto a square surface.
- **`cropGalleryPicks`** — without it, a Gallery-tab pick is inserted as-is,
  so an existing image's own shape can still land in a fixed-shape slot; with
  it, every Gallery-tab pick is routed through the same crop editor first and
  stored as a **new** gallery image, leaving the original untouched. The
  slide-option thumbnails, PLACE_ON_IMAGE's backing image, and Drawing's
  prompt image all set it.
- **`cropAspect: "source"`** — the crop box instead takes the uploaded
  image's own aspect ratio, learned via `react-easy-crop`'s `onMediaLoaded`,
  so at zoom 1 the whole image is kept and nothing is clipped unless the
  author zooms in deliberately. The option (and its plumbing through
  `useGalleryPicker`) still exists, but no caller opts into it today —
  PLACE_ON_IMAGE and Drawing's prompt-image picker, its original callers,
  both moved to the square `cropWidth`/`cropHeight` + `cropGalleryPicks`
  combination above. Every other gallery-picker caller (deck/slide cover &
  background, MCQ option images, Axis item images, theme logo/background)
  keeps its own fixed-shape crop.

## Status / gaps

The content model, grader, authoring surface, and full live-session pipeline
(participant view, answer validation, live board, pin tally, reveal) all
exist — see [Live pipeline](#live-pipeline) and [Board UX](#board-ux) above.
One gap remains, verified against the current code:

- **No results chart.** `Charts/registry.ts`:
  `PLACE_ON_IMAGE: { supportedViz: ["IMAGE_OVERLAY", "HEATMAP", "NONE"], implemented: false }`
  — see the [results-visualization](../results-visualization.md) per-type
  note (image-aware scatter/heatmap overlay, needs an image-aware renderer).
  The live board's own scatter and target-reveal (above) already cover the
  in-session view; this gap is only the post-round/editor results chart.
