# Place-on-Image Slides

A **PLACE_ON_IMAGE slide** asks a player to pin a single point on a backing
image; it's [Axis](../axis-slides/README.md)'s sibling — same normalized
`[0, 1]` coordinate and radius conventions, minus the labeled plane, with the
image standing in for the plane. Axis's README treats PLACE_ON_IMAGE as its
model precedent; this doc covers the parts specific to PLACE_ON_IMAGE itself.

**Status: authoring only.** The content model and grader predate this doc; the
authoring surface (editor) landed afterwards. The live-session side — a
participant-safe config view, answer validation, a board component, and a
results chart — does not exist yet (see [Status](#status--gaps) below), so a
PLACE_ON_IMAGE slide can be built in the deck editor but not yet played in a
live session.

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

`session/answer/payload/PlaceOnImageAnswer.java` — a single point, not a map
(one pin per slide, unlike Axis's per-item map):

```java
public record PlaceOnImageAnswer(double x, double y) implements AnswerPayload {
  @Override public SlideType slideType() { return SlideType.PLACE_ON_IMAGE; }
}
```

## Grading

`RoundEvaluator.gradePlaceOnImage` — correct if the pin lands inside **any**
target's circle (not "every target", unlike Axis's all-or-nothing map match):

```java
private static boolean gradePlaceOnImage(PlaceOnImageContent content, PlaceOnImageAnswer answer) {
    if (content.scoreMode() != ScoreMode.INSIDE_RADIUS || content.correctTargets() == null) {
        return false;
    }
    for (Target target : content.correctTargets()) {
        if (Math.hypot(answer.x() - target.x(), answer.y() - target.y()) <= target.radius()) {
            return true;
        }
    }
    return false;
}
```

- **`INSIDE_RADIUS` is the only implemented mode** — `NEAREST` and `DISTANCE`
  are declared on `ScoreMode` but return `false` across `RoundEvaluator` today,
  same as Axis.
- **A target-less slide is legitimate collect-only** — an empty
  `correctTargets` list always grades `false`, making the slide an unscored
  "drop a pin" prompt (the Scales/Axis collect-only convention).

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
  Grid's banks: row order drives each marker's number and palette default, so
  reordering is how an author renumbers and recolors the set
  (`usePlaceOnImageEditor`'s `handleItemDragEnd` splices `correctTargets` by
  index — positional rather than id-addressed, which keeps targets authored
  before ids reached the wire reorderable too). Each row wraps the shared
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

The content model, grader, and (as of this doc) the authoring surface exist.
The live-session side does not — verified against the current code, not
planned or in progress:

- **No participant-safe config view.** `SlideView.java`'s `from(...)` factory
  has a branch per playable kind (`McqContent`, `QAndAContent`, `GridContent`,
  `AxisContent`, `ScalesContent`, `MatchingContent`, `DrawingContent`) but none
  for `PlaceOnImageContent` — a live session never sends players the image or
  targets to look at.
- **No answer validation.** `LiveSessionAnswerService.validatePayload` has a
  dedicated `validate*` method per playable kind; PLACE_ON_IMAGE falls through
  the comment "other content types are stored as-is; their tally/validation
  lands with scoring."
- **No live board component.** `BoardQuestion.tsx` has a `case` for MCQ,
  Q_AND_A, GRID, AXIS, SCALES, MATCHING, and DRAWING — none for
  PLACE_ON_IMAGE.
- **No results chart.** `Charts/registry.ts`:
  `PLACE_ON_IMAGE: { supportedViz: ["IMAGE_OVERLAY", "HEATMAP", "NONE"], implemented: false }`
  — see the [results-visualization](../results-visualization.md) per-type
  note (image-aware scatter/heatmap overlay, needs an image-aware renderer).

Building out the live pipeline (participant view, validation, board, tally,
chart) is the natural next slice of work, following the staged pattern Axis's
[implementation checklist](../axis-slides/README.md#implementation-checklist)
used (model + authoring → answer pipeline → live board).
