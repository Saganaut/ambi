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
    AppImage image,               // the backing image players click on
    List<Target> correctTargets,  // correct regions — NEVER sent to clients
    ScoreMode scoreMode           // fixed INSIDE_RADIUS; no authoring knob
) implements ScorableContent {
  @Override public SlideType contentType() { return SlideType.PLACE_ON_IMAGE; }
}
```

`Target(String id, String label, AppImage image, String color, double x,
double y, double radius)` (shared with Axis, in `SlideContentTypes.java`)
carries the same optional author annotations as Axis's `AxisItem` —
`label`, `image`, `color` — so the editor's shared `ItemField` row control
(see [Editor UX](#editor-ux) below) can label a target, override its
palette color, or attach an image; the grader reads only `x`/`y`/`radius`
and ignores the rest. `correctTargets` is a **list**, not Axis's id-keyed
map, but the editor still addresses targets **by id** (`Target.id`, minted
by `addTarget`) rather than by array position — see
[Hook](#hook--useplaceonimageeditorts).

Coordinates are screen-space over the image box: **`(0, 0)` is the image's
top-left corner**, y is *not* inverted — the opposite of Axis's bottom-left
origin. `RoundEvaluator.gradePlaceOnImage`, the editor's placement surface,
and the answer payload all measure in this same space. That origin is stated
once, as `invertY: false`, where the editor's surface calls the shared
placement kit — the stored point *is* the rendered point, so nothing between
the grader and the marker flips y.

### Answer payload

`session/answer/payload/PlaceOnImageAnswer.java` — a per-target map, like
Axis's `AxisAnswer` (one pin per authored target, not one pin per slide):

```java
/** Placement of each item id at a normalized (0..1) pin on the image. */
public record PlaceOnImageAnswer(Map<String, PlacePoint> placements) implements AnswerPayload {
  @Override public SlideType slideType() { return SlideType.PLACE_ON_IMAGE; }
}
```

`PlacePoint(double x, double y)` (`SlideContentTypes.java`) is
Place-on-Image's own point record — structurally identical to Axis's
`AxisPoint` but kept distinct per kind, the same one-record-per-kind
convention `AxisItem`/`Target` follow.

## Grading

`RoundEvaluator.gradePlaceOnImage` mirrors `gradeAxis`'s loop-over-answer-key:
**every** target's own pin must land inside that target's own radius (each
target carries its own radius rather than one shared plane tolerance, but the
all-or-nothing shape is identical to Axis's map match):

```java
private static boolean gradePlaceOnImage(PlaceOnImageContent content, PlaceOnImageAnswer answer) {
    if (content.scoreMode() != ScoreMode.INSIDE_RADIUS
            || content.correctTargets() == null || content.correctTargets().isEmpty()
            || answer.placements() == null) {
        return false;
    }
    for (Target target : content.correctTargets()) {
        PlacePoint placed = answer.placements().get(target.id());
        if (placed == null || Math.hypot(placed.x() - target.x(),
                placed.y() - target.y()) > target.radius()) {
            return false;
        }
    }
    return true;
}
```

- **All-or-nothing over every target** — a missing or off-target pin for any
  one target fails the whole round, the same single `ParticipantOutcome.correct`
  boolean shape Axis uses.
- **`INSIDE_RADIUS` is the only implemented mode** — `NEAREST` and `DISTANCE`
  are declared on `ScoreMode` but return `false` across `RoundEvaluator` today,
  same as Axis.
- **A target-less slide is legitimate collect-only** — an empty
  `correctTargets` list always grades `false`, making the slide an unscored
  "drop a pin" prompt (the Scales/Axis collect-only convention).

## Live pipeline

### Participant-safe view

`session/event/dto/PlaceOnImageConfigView.java`, wired as `SlideView.placeOnImage`:
the backing image's presigned `imageUrl` plus one `PlaceItemView(id, label,
imageUrl, color)` per authored target — never the targets' `x`/`y`/`radius`,
which stay the answer key until reveal.

### Answer validation

`LiveSessionAnswerService.validatePlaceOnImage`, mirroring `validateAxis`: at
least one item placed, every placement key one of the slide's target ids,
every point finite and within `[0, 1]`. `PlaceOnImageAnswer` also joins the
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
`PlaceTargetView(id, x, y, radius, label, color)` per authored target,
disclosed only once the round enters results, so the board can draw the
correct-location circles. The snapshot service carries the same list for a
client that joins mid-reveal.

## Editor UX

### Hook — `usePlaceOnImageEditor.ts`

Over the generic `useSlideEditor(deckId, slideId, "PLACE_ON_IMAGE")`:

- Synthesized `question` view (`prompt` from `slide.title`, `image`,
  `targets`, one shared `tolerance`); debounced `schedulePrompt`.
- `setImage(image)` — immediate; swaps the backing image.
- Coordinate/structural ops, addressed **by target id** (Axis's item ops):
  `addTarget(point?)` (defaults to image centre, mints a `nanoid(8)` id),
  `moveTarget(targetId, point)`, `removeTarget(targetId)`.
- Author-annotation ops, mirroring Axis's item ops and likewise id-addressed:
  `scheduleTargetLabel(targetId, label)` (debounced),
  `setTargetColor(targetId, color)` and `setTargetImage(targetId, image)`
  (both immediate).
- **Id addressing over a list.** Because `correctTargets` is an array, each
  write resolves the id back to an index — *inside* the `updateSlideContent`
  updater, against the freshest draft, so back-to-back writes in one debounce
  window can't address a stale list. A key matching nothing (a row the author
  has since removed) is a no-op. Targets authored before `Target.id` reached
  the wire stay reachable through the `target-<index>` fallback key
  `targetKey(target, index)` mints, which is also what
  `PlaceTargetView.id` carries; the fallback is a UI address only and never
  reaches the wire.
- **`setTolerance(value)`** — the one knob that matters: every target's
  `radius` on the wire is kept in lockstep (clamped `0.02`–`0.5`, i.e. 2–50 %),
  so a target-less slide's *next* `addTarget` seeds at the shared default
  (`PLACE_TOLERANCE_DEFAULT = 0.1`). PLACE_ON_IMAGE's `Target.radius` is
  per-target on the wire (unlike Axis's slide-level `tolerance` field) —
  the editor's lockstep behavior is a UI simplification over that model, not
  a model constraint; per-target tolerance is authorable by hand-editing the
  content, just not through this editor.
- Constants: `MAX_PLACE_TARGETS = 6` (one per shared palette color, matching
  Axis's item cap), `PLACE_TOLERANCE_MIN/MAX/DEFAULT = 0.02 / 0.5 / 0.1`,
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
  the header, one `PlacementRow` per target, add/remove). The rows are
  **draggable by their grip**, wrapped in a `DragDropWrapper` like Axis's and
  Grid's banks: row order drives each marker's number, so reordering is how an
  author renumbers the set — and renumbering is all it does. Each target owns
  its coordinates and the color minted for it at creation
  (`nextPaletteColor`, backfilled for legacy targets by
  `useItemIdentityBackfill` on load), so no marker moves or changes hue
  (`usePlaceOnImageEditor`'s `handleItemDragEnd` splices `correctTargets` by
  index — positional rather than id-addressed, because a drop only ever states
  "the row at this position moved to that one"). Each row wraps the shared
  `ItemField` — the label doubles as the popover trigger, and the menu holds
  the shared color palette/custom-color modal, image upload/clear, and delete;
  there is no kind-specific `primaryAction`, since a target exists only by
  being placed. The row shows an image thumbnail when the target has one, and
  is always `scored`. `useSlideComposerState`
  holds the prompt mirror and which row's menu is open (at most one); every
  other callback addresses its target by `target.id`. Advisory (non-blocking) footer
  nudges for an image and at least one target — a target-less slide is still
  valid.
- `PlaceOnImageSurface.tsx` — the placement surface: a plain block `<img>` at
  its intrinsic aspect ratio (never letterboxed/stretched), so the normalized
  overlay coordinates land exactly where players would see them. The image
  box, the image, and the no-image 16:9 stand-in are all this file's own CSS;
  the surface chrome and pointer machinery are the kit's `.surface` /
  `.surfaceArmed` and `usePlacementSurface({ invertY: false, … })`. Press the
  open image to drop a new target and keep dragging it; release commits via
  `addTarget`. Because that target has no id until it commits, the in-flight
  placement is drawn as a **ghost** `PlacementMarker`, keyed on the hook's
  `PENDING_PLACEMENT_KEY` sentinel. Placed markers drag directly (pointer
  capture) and commit through `onMoveTarget(targetId, point)`; a press on one
  means nothing but "move me", so this surface passes no `onMarkerTap` (Axis's
  tap-to-select has no analogue without a bank). Markers are the shared
  `PlacementMarker` in the target's resolved color
  (`resolveDatumColor(target.color, index)` — the authored override when set,
  else the shared 6-color palette by index): a labeled target grows a label
  pill next to its numbered dot — the dot, not the pill, stays centred on the
  graded point — and each marker draws its tolerance circle sized off the
  image box's width with a 1:1 aspect ratio, so it reads as a circle on a
  non-square image while the grading space stays the normalized one.
- Image picking uses `cropAspect: "source"` (see
  [below](#gallerypicker-cropaspect-source)) so the uploaded backing image is
  never clipped to a fixed frame before the placement surface — which renders
  at the image's own ratio — sees it.

### Registration

- `slideContent.ts` — `buildDefaultContent` case `"PLACE_ON_IMAGE"`: minimal
  `{ external: true }` placeholder image, empty `correctTargets`,
  `scoreMode: "INSIDE_RADIUS"`.
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

## `GalleryPicker` `cropAspect: "source"`

The shared `useGalleryPicker` → `GalleryPicker` → `UploadTab` →
`ImageCropEditor` chain gained a `cropAspect?: "source"` option (alongside the
existing fixed `cropWidth`/`cropHeight`, default 16:9): the Upload tab's crop
box takes the uploaded image's own aspect ratio, learned via
`react-easy-crop`'s `onMediaLoaded`, so at zoom 1 the whole image is kept and
nothing is clipped unless the author zooms in deliberately. PLACE_ON_IMAGE and
`DrawingSlideContent.tsx` (its prompt-image picker) are the two callers that
opt in today; every other gallery-picker caller (deck/slide cover &
background, MCQ option images, Axis item images, theme logo/background) keeps
its fixed-shape crop.

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
