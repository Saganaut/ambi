# Axis Slides

An **AXIS slide** is a free-form 2D placement question: players drag item chips
anywhere on an X × Y plane whose axes carry low/high endpoint labels (e.g.
*Weak → Strong* × *Slow → Fast*). It sits **alongside** GRID, not instead of
it — GRID is discrete (items snap into labeled matrix cells, graded by exact
cell match); AXIS is continuous (items land at arbitrary normalized
coordinates, graded by distance to an author-set target within a tolerance
radius). Coordinate and radius conventions are borrowed wholesale from
[PLACE_ON_IMAGE](../place-on-image/README.md), which is AXIS minus the image.

**Status: implemented (v1).** All three stages of the
[implementation checklist](#implementation-checklist) have landed: the content
model + authoring surface, the live answer pipeline, and the live board. The
[follow-ups](#follow-ups-named-out-of-v1) (F1 target reveal, F2 scatter, …)
remain open.

## Model

Coordinate space is **normalized `[0, 1]` doubles on both axes** (the
`Target(id, x, y, radius)` convention from `PLACE_ON_IMAGE` in
`presentation/slide/content/parts/SlideContentTypes.java`). `(0,0)` is the
low/low corner (bottom-left as rendered), `(1,1)` high/high.

New shared records in `SlideContentTypes.java`:

```java
/** A point on the axis plane, normalized to [0, 1] on both axes. */
public record AxisPoint(double x, double y) { }

/** An item players place on the axis plane. {@code image} and {@code color} are optional. */
public record AxisItem(String id, String label, AppImage image, String color) { }
```

The content record (`presentation/slide/content/AxisContent.java`):

```java
public record AxisContent(
    String xLowLabel, String xHighLabel,      // X-axis endpoint labels
    String yLowLabel, String yHighLabel,      // Y-axis endpoint labels
    List<AxisItem> items,
    Map<String, AxisPoint> correctPositions,  // itemId → target; the answer key — NEVER sent to clients
    double tolerance,                         // normalized radius, one knob per slide
    ScoreMode scoreMode                       // fixed INSIDE_RADIUS; no authoring knob
) implements ScorableContent {
  @Override public SlideType contentType() { return SlideType.AXIS; }
}
```

Shape decisions (each follows an existing precedent):

- **Flat endpoint labels**, not a nested record — `ScalesContent` models its
  endpoints as flat `leftLabel`/`rightLabel` strings.
- **New `AxisItem`**, not a reused `GridItem` — the codebase mints one item
  record per kind (`RankItem`, `ScaleItem`, `GridItem`, `MatchItem`).
  `AxisItem` carries optional `image` and `color` (mirroring `McqOption`'s
  optional image + color), so the editor's item menu can offer a palette/
  custom color override and an image thumbnail. `AxisConfigView` (the
  participant-safe view) still sends only `id`/`label` — plumbing
  image/color through to the live board is a named follow-up.
- **Structured `AxisPoint`, not a `"x,y"` string** — grid's `"r,c"` string
  earns its keep as an *identity* (map value, tally-key suffix, and DOM key
  for small integers at once). Continuous floats have no identity role, and
  `PlaceOnImageAnswer(double x, double y)` already sets the
  structured-doubles precedent.
- **Per-slide `tolerance`, not per-item radius** — `ScalesContent.tolerance`
  and `AllocationContent.tolerancePerOption` are single knobs; PlaceOnImage's
  per-target radius exists because image regions have intrinsically different
  sizes. A per-item override is an additive follow-up
  (`Map<String, Double> toleranceOverrides`), not v1.
- **`scoreMode` fixed to `INSIDE_RADIUS`** and never written by the editor,
  exactly as the grid editor hard-codes `EXACT`.

Distance is Euclidean **in normalized space**, as in `gradePlaceOnImage` — on
a non-square rendered plane the accepted region is visually an ellipse. The
editor and board render the plane near-square and draw tolerance circles in
the same normalized space, so what the author sees is what is graded.

### Participant-safe view

`session/event/dto/AxisConfigView.java`, wired as a per-kind field on
`SlideView` next to `grid`:

```java
public record AxisConfigView(
    String xLowLabel, String xHighLabel,
    String yLowLabel, String yHighLabel,
    List<AxisItemView> items) {              // AxisItemView(id, label)
```

It never carries `correctPositions` **or `tolerance`** — tolerance is
grading-only knowledge pre-reveal. It also drops `AxisItem`'s optional
`image`/`color` for now — those exist on the authoring model but aren't yet
plumbed through to players (see [follow-ups](#follow-ups-named-out-of-v1)).

### Answer payload

`session/answer/payload/AxisAnswer.java`, wire discriminator `"AxisAnswer"`
(subtype simple-name convention, matching `"GridAnswer"`):

```java
/** Placement of each item id at a normalized point on the plane. */
public record AxisAnswer(Map<String, AxisPoint> placements) implements AnswerPayload {
  @Override public SlideType slideType() { return SlideType.AXIS; }
}
```

### Registration points

All verified single-registration seams; each is a one-line-per-layer edit:

- `SlideType.AXIS` enum member (`presentation/slide/enums/SlideType.java`).
- `SlideContent.java` — the **three synchronized entries**: `@JsonSubTypes`,
  the `oneOf` list, and `@DiscriminatorMapping("AXIS")`.
- `ScorableContent.java` — `@JsonSubTypes` entry + `permits` clause.
- `AnswerPayload.java` — `@JsonSubTypes` entry + `permits` clause.
- `SlideView.java` — nullable `axis` field + `instanceof AxisContent` branch
  in the `from(...)` factory.
- `RoundEvaluator.isCorrect` — `case AxisAnswer` arm (see
  [Grading](#grading)).

## Invariants

1. **Key consistency** — `correctPositions` is keyed only by ids of live
   `items`; editor structural ops maintain this (removing an item drops its
   entry), the same invariant grid's editor keeps for `correctCells`.
2. **Normalized bounds** — every authored target and every submitted
   placement satisfies `0 ≤ x,y ≤ 1` and is finite; `tolerance` is normalized
   (`0.02 – 0.5`). Answer-path enforcement lives in `validateAxis`.
3. **Answer-key privacy** — `correctPositions`/`tolerance` never appear in
   `AxisConfigView` or any pre-reveal event. (Post-reveal disclosure is
   follow-up F1.)
4. **Collect-only is legitimate** — an empty `correctPositions` map grades
   `false` for everyone (the `gradeScales` convention) and simply makes the
   slide an unscored opinion plane ("place yourself on the 2×2"). The editor
   nudges but does not block (advisory footer, grid parity).

## Endpoints

None new. Slide CRUD is the generic deck/slide API; `AxisContent` rides the
polymorphic `SlideContent` payload, and answers ride the generic
`submitAnswer` route.

## Grading

`RoundEvaluator.gradeAxis` composes the two existing shapes — `gradeScales`'
loop-over-answer-key with `gradePlaceOnImage`'s radius test:

```java
private static boolean gradeAxis(AxisContent content, AxisAnswer answer) {
    if (content.scoreMode() != ScoreMode.INSIDE_RADIUS
            || content.correctPositions() == null || content.correctPositions().isEmpty()
            || answer.placements() == null) return false;
    for (var e : content.correctPositions().entrySet()) {
        AxisPoint placed = answer.placements().get(e.getKey());
        if (placed == null || Math.hypot(placed.x() - e.getValue().x(),
                placed.y() - e.getValue().y()) > content.tolerance()) return false;
    }
    return true;
}
```

- **All-or-nothing boolean**: every keyed item must land within tolerance.
  This is what the pipeline supports — `ParticipantOutcome` carries a single
  `boolean correct`; there is no per-item outcome channel.
- **Partial credit is explicitly deferred.** `ScoreMode.PARTIAL` / `CLOSEST` /
  `NEAREST` / `DISTANCE` are unimplemented seams that return `false` across
  `RoundEvaluator` today; AXIS adds no authoring knob it cannot honor.
- `describeChoice` and `correctKey` need **no changes** — their null paths
  already cover map-shaped answers, which is also what makes the reveal
  behavior below work.

## Live pipeline

### Answer validation

`LiveSessionAnswerService.validateAxis`, mirroring `validateGrid`: placements
non-null and non-empty, every key an item id present on the slide, every
point finite and within `[0, 1]`. AXIS also joins the whole-map resubmit
override:

```java
int effectiveMaxSelections =
    payload instanceof GridAnswer || payload instanceof AxisAnswer ? 0 : maxSelections;
```

(a resubmitted placement map must overwrite, not lock on first submit).

### Live tally — quantized buckets

Exact coordinates cannot be histogram keys, so `AnswerTallyKeys.optionKeys`
**quantizes each placement into a 10 × 10 bucket grid** at key-derivation
time — one key per placement:

```text
itemId@bx,by      where bx = min(floor(x * AXIS_TALLY_BUCKETS), AXIS_TALLY_BUCKETS - 1)
```

with `public static final int AXIS_TALLY_BUCKETS = 10;` in `AnswerTallyKeys`.

This reuses the entire existing pipeline unchanged: the `@` separator grammar
(`GRID_KEY_SEPARATOR`; bucket indices are small ints, so `"bx,by"` is exactly
grid's cell-id grammar), `TallyStore` HINCRBY, the orchestrator's resubmit
reconciliation (prior payload's keys removed, new keys added — deterministic
derivation makes resubmits correct for free), `TallyUpdated` events, and the
snapshot's `optionTally` for late joiners.

The bucket count must agree between backend key emission and frontend
rendering. It is not a request-DTO bound, so it does **not** flow through
`generate-validation`: the frontend mirrors it as a constant with a comment
pointing at `AnswerTallyKeys.AXIS_TALLY_BUCKETS` (the same manual-mirror
discipline as `NON_SCORABLE_SLIDE_TYPES` in `slideContent.ts`).

### Reveal

Durable `RoundResult.optionCounts` is **empty** for AXIS (`describeChoice`
returns null for map-shaped answers), so the reveal-time guard in
`liveSessionSlice.ts` — durable counts only overwrite the live tally when
non-empty — keeps the live bucket heat on screen through reveal. This is the
same seam GRID sits on (see
[open decisions §D5](../../live-session-open-decisions.md)). No new events in
v1.

## Editor UX

### Hook — `useAxisEditor.ts`

Over the generic `useSlideEditor(deckId, slideId, "AXIS")`, cloning
`useGridEditor.ts`'s surface:

- Synthesized `question` view; debounced `schedulePrompt` → `slide.title`.
- `scheduleAxisLabel(axis: "x" | "y", end: "low" | "high", text)` — debounced
  endpoint-label edits. (No add/remove-lane analogue of grid's
  `remapAfterRemoval` — axes are fixed, a genuine simplification.)
- Item ops: `addItem` / `removeItem` (removal drops the item's
  `correctPositions` entry — invariant 1), `scheduleItemLabel`,
  `handleItemDragEnd` for row display order.
- `setItemColor(itemId, color)` and `setItemImage(itemId, image)` —
  immediate commits, each patching one item (menu-driven edits).
- `setTargetPosition(itemId, point | null)` and `setTolerance(value)` —
  immediate + flush (structural, like grid's cell assignment).
- Constants: `MIN_AXIS_ITEMS = 1`, `MAX_AXIS_ITEMS = 6` (one per palette color),
  `AXIS_TOLERANCE_MIN = 0.02`, `AXIS_TOLERANCE_MAX = 0.5`,
  `AXIS_TOLERANCE_DEFAULT = 0.1`; endpoint/item label inputs `maxLength` 80.

### Components — `SlideContent/AxisSlideContent/`

- `AxisSlideContent.tsx` — composition plus the scoring footer:
  `fullyAssigned = items.every(item => correctPositions[item.id])`, rendered
  as an advisory nudge ("Set a target position for every item to make this
  slide scoreable") — non-blocking, because collect-only is legitimate
  (invariant 4). Also owns which row is selected (armed for placement) and
  which row's popover menu is open. The Plane and Items `SettingsCard`s sit
  side by side (wrapping on narrow containers) so the plane and the item
  bank read as one workspace; the Plane card header holds the "N of M
  placed" counter next to the shared `ToleranceField` ("Tolerance %", 2–50,
  wired to `setTolerance`). The prompt mirror, selected row, and open menu
  are held by the shared `useSlideComposerState`.
- `AxisPlaneEditor.tsx` — the four endpoint-label pills overlaid *inside* the
  plane's edges (top/bottom = Y high/low, left/right = X low/high; empty
  labels fall back to placeholders, grid's `"Row 1"` pattern) so the plane
  claims all the room. **Select a row, then press/drag on the plane** →
  `getBoundingClientRect` → normalized point → `setTargetPosition` (committed
  on release). Placed markers — a numbered dot in the item's resolved color
  (`resolveDatumColor(item.color, index)`: the item's stored color — stamped
  at creation by `nextPaletteColor` from the shared 6-color palette, one
  distinct color per item at the `MAX_AXIS_ITEMS = 6` cap, with a
  darker-lightness second cycle kept as a defensive fallback should the cap
  ever rise; the positional fallback is dead weight once
  `useItemIdentityBackfill` has run), growing a label
  pill only when the item is labeled, dot centered on the target — can be
  dragged directly (pointer capture) or tapped to toggle their row's
  selection. Every placed marker renders its tolerance circle in the same
  color so the accepted region is visible while tuning. **The pointer-free
  path is the row menu's "Set target"** (seeds `{x: 0.5, y: 0.5}`, the plane's
  center), reachable by keyboard because focusing a row's label opens its
  menu; the numeric X/Y input pair that once backed keyboard placement is
  gone. Nothing here is Axis-specific except the plane: the surface's pointer
  bookkeeping and the markers come from the shared placement kit (see below).
- **Rows and markers come from the shared placement kit**
  (`SlideContent/_shared/placement/`), which Axis, [Place-on-Image](../place-on-image/README.md),
  and Grid all build on: `usePointerPlacement` (press-to-place,
  drag-to-move, tap-to-select, pointer capture, one commit on release),
  `usePlacementSurface` (that gesture resolved to normalized coordinates,
  parameterized by `invertY` — Axis inverts, Place-on-Image doesn't, and Grid
  resolves to a cell instead), `PlacementMarker` (numbered
  dot + optional label pill + tolerance circle), and
  `ToleranceField` (the ×100 / ÷100 percent wrapper around `NumberInput`).
  The item row itself is `_shared/PlacementRow/` — one level up from the
  placement folder, since Ranking lists it too. Axis renders `PlacementRow`
  with `draggable`, `scored` (set for any item with a `correctPositions`
  entry), and an inline `primaryAction` for the
  "Set target" / "Clear target" toggle; there is no Axis-specific row or
  field component. Coordinate helpers live in `placementGeometry.ts`
  (component layer) and `@deck/utils/placement.ts` (hook layer).
  `PlacementRow` wraps the shared `ItemField`
  (`_shared/ItemField/ItemField.tsx`), also used by
  [Place-on-Image](../place-on-image/README.md)'s target
  rows, which owns the generic mechanics: the label `Input` is itself the
  popover's trigger, wrapped in a `.triggerWrap` anchor div; focusing it
  opens the menu. The shared `FloatingPopover`
  (`shared/components/Popover/PopoverWrapper.tsx`) handles portalling,
  floating-ui positioning (`flip`/`shift`, replacing the old manual
  flip-to-fit measurement), and dismissal (outside press + Escape via
  `useDismiss`) —
  the field is the popover's anchor, so it counts as "inside" and typing in
  it never dismisses the menu, with no DOM-id boundary check needed.
  `manageFocus={false}` keeps the caret in the field on open;
  `listNavigation` gives Up/Down roving focus through the menu's buttons via
  `PopoverNavContext`. The menu body is the shared `OptionMenuContent`
  rendered directly — the legacy `OptionMenu` shell is no longer part of
  the Axis (or Place-on-Image) path. Below the kind-specific primary
  action: the shared color palette + custom-color modal, upload/remove
  image via the gallery picker, and delete. The row's old inline "Set
  target" button and clear-target icon are gone — those actions live in
  the menu now.

**Shared dependency:** all render the shared
`_shared/OptionMenu/OptionMenuContent.tsx` — the presentational menu body
(palette + custom color, image upload/clear, delete, and a `primaryAction`
prop each kind supplies: MCQ passes mark-correct, Axis passes
set/clear-target, Match passes the phrase/image face flip — Grid,
Place-on-Image, and Ranking pass none). Every `PlacementRow` bank (Axis,
Grid, Ranking, Place-on-Image) reaches it via the shared
`_shared/ItemField/ItemField.tsx` (label field as popover trigger,
`FloatingPopover`, `OptionMenuContent`); MCQ
(`OptionControls/OptionField.tsx`) and Match
(`_shared/PhraseOrImageCard/PhraseOrImageCard.tsx`) render
`FloatingPopover`/`OptionMenuContent` directly rather than through
`ItemField`. The legacy
`_shared/OptionMenu/OptionMenu.tsx` shell (manual outside-pointerdown/Escape
dismissal, static start/end alignment) has been removed now that every kind
is on the `FloatingPopover` path.

### Registration

- `slideContent.ts` — `buildDefaultContent` case `"AXIS"`: empty labels, two
  seeded items (`buildDefaultAxisItem`: nanoid(8) id, empty label), empty
  `correctPositions`, `tolerance: 0.1`, `scoreMode: "INSIDE_RADIUS"`.
- `SlideDisplay.tsx` — lazy import + `case "AXIS"`.
- `NewSlideModal` — `SLIDE_TYPE_LABELS.AXIS: "Axis"`; a `slideTypeGraphics`
  tile.
- `deckMockData.ts` — one AXIS fixture.
- Codegen after the backend lands: run `generate-api`,
  `generate-validation`, `generate-enums` **individually** (the combined
  `npm run generate` aborts on a known dev-controller issue).

## Board UX

`AxisBoardContent.tsx` (+ module.css + test) in
`SessionBoard/content/`, wired as `case "AXIS"` in `BoardQuestion.tsx`. One
component serves participant and projector via the established
`mode`/`interactive` props (the `GridBoardContent` pattern).

- **Tap-to-select, tap-at-point-to-place.** Bank of chip buttons, seeded
  shuffle by slide id — note `seededShuffle` is a private const in
  `GridBoardContent.tsx`, so the AXIS commit extracts it to a shared module
  (or duplicates the ~12 lines); tap to hold
  (`aria-pressed`), tap the plane to place at the tap's normalized
  coordinates, tap a placed chip to pick it back up. No drag needed — for a
  continuous surface the second tap inherently carries the coordinates, which
  sidesteps the drag complexity and nested-button pitfalls GRID's
  tap-to-place already avoids.
- **Keyboard path**: placed chips are real buttons; arrow keys nudge the
  focused chip in 2 % steps.
- Round-local draft `Record<itemId, {x, y}>`, reset on `slideId` change;
  Submit gated on all items placed;
  `sendAnswer(slideId, { answerType: "AxisAnswer", placements })`; resubmit
  allowed until lock (the `maxSelections = 0` override).
- **liveResults / results**: a 10 × 10 translucent heat overlay aggregated
  from the `itemId@bx,by` tally keys (the bucket-split analogue of
  `GridBoardContent.cellTotals`), plus the viewer's own placed chips; on
  `results`, the own-outcome banner from `ResultsRevealed.outcomes`. No
  correct-target overlay in v1 (follow-up F1).
- **Projector** (non-interactive): plane + heat only.

## Results visualization

v1 ships the live bucket heat and the own-outcome banner. The post-round
chart pipeline gets the standard not-yet-implemented stubs:

- `Charts/registry.ts` — `AXIS: { supportedViz: ["HEATMAP", "NONE"],
  implemented: false }`.
- A row in the [results-visualization](../results-visualization.md)
  chart-fit matrix: payload `Map<itemId,{x,y}>`, planned viz = scatter with
  per-item color (heat fallback).

True scatter needs raw placements on a surface the client can read — that is
follow-up F2, not a registry entry.

## Validation bounds

Following the codebase's actual split — structural caps are frontend editor
constants (grid precedent: `GridContent` carries no annotation bounds);
runtime safety is answer-path validation:

| Constant | Value | Where enforced |
| --- | --- | --- |
| `MIN_AXIS_ITEMS` / `MAX_AXIS_ITEMS` | 1 / 6 | `useAxisEditor.ts` |
| `AXIS_TOLERANCE_MIN` / `MAX` / `DEFAULT` | 0.02 / 0.5 / 0.1 | `useAxisEditor.ts` (tolerance `NumberInput` bounds) |
| Endpoint & item label length | 80 | editor input `maxLength` |
| Placement bounds (`[0,1]`, finite) | — | `LiveSessionAnswerService.validateAxis` |
| `AXIS_TALLY_BUCKETS` | 10 | `AnswerTallyKeys` (backend) + mirrored frontend constant |

No content-record bean-validation annotations exist for any kind today; if
that codebase-wide gap is ever closed, `AXIS_ENDPOINT_LABEL_MAX = 80` belongs
in `ValidationConstants`.

## Implementation checklist

Staged commits, mirroring how GRID landed (`9c74db0` → `cd74523` → `86b04e8`):

1. **`feat(deck)` — model + authoring surface.** `SlideType.AXIS`;
   `AxisPoint`/`AxisItem`/`AxisContent` + the sealed-hierarchy registrations;
   codegen (three individual scripts); `buildDefaultContent` +
   `buildDefaultAxisItem`; `useAxisEditor`; `AxisSlideContent/` components;
   `SlideDisplay`/`NewSlideModal`/`slideTypeGraphics`/`deckMockData`
   entries. Tests: editor-hook structural ops (item removal drops its
   target), default-content shape.
2. **`feat(session)` — answer pipeline.** `AxisAnswer` + registration;
   `AxisConfigView` + `SlideView.axis`; `validateAxis` + the
   `maxSelections = 0` override; `AnswerTallyKeys` bucket keys +
   `AXIS_TALLY_BUCKETS`; `RoundEvaluator.gradeAxis`. Tests:
   `AnswerTallyKeysTest` (bucketing incl. the `x = 1.0` clamp),
   `LiveSessionAnswerServiceTest` (bounds, unknown ids, resubmit),
   RoundEvaluator grading (inside/outside tolerance, missing item,
   collect-only).
3. **`feat(session)` — live board.** `AxisBoardContent` + CSS + tests;
   `BoardQuestion` case; mirrored bucket constant; registry stub row.
   Tests: place/pick-up/submit gating, heat aggregation from bucket keys,
   read-only projector mode, own-outcome banner (the `GridBoardContent.test`
   harness).

Each commit follows the full feature workflow (commit via the conventions,
then review).

## Follow-ups (named, out of v1)

- **F1 — structured answer-key reveal.** A typed per-kind field on
  `ResultsRevealed` (e.g. `revealedKey`) so boards can overlay targets +
  tolerance circles post-reveal. Post-reveal disclosure is precedented
  (`correctOption` reveals the MCQ key); the blocker is only that the field
  is `String`-shaped. **Shared seam with GRID** — spec it once for both.
- **F2 — raw-placement scatter.** True scatter of all placements needs raw
  payloads on an event or a host-side read of round results.
- **Per-item tolerance override** (`Map<String, Double>`, additive).
- **Item image/color reaching players.** `AxisItem` gained optional `image`
  and `color` in the authoring surface, but `AxisConfigView` (and so
  `AxisBoardContent`) still only sees `id`/`label` — wiring the
  participant-safe view and the live board to render them is the remaining
  step.
- **Partial credit** (`ScoreMode.PARTIAL`/`DISTANCE`) — needs new scoring
  machinery; today `RoundEvaluator` is boolean-only.
