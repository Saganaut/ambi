# Axis Slides

An **AXIS slide** is a free-form 2D placement question: players drag item chips
anywhere on an X × Y plane whose axes carry low/high endpoint labels (e.g.
*Weak → Strong* × *Slow → Fast*).

It sits **alongside** GRID, not instead of it. GRID is discrete — items snap
into labeled matrix cells, graded by exact cell match. AXIS is continuous —
items land at arbitrary normalized coordinates, graded by distance to an
author-set target within a tolerance radius.
[PLACE_ON_IMAGE](../place-on-image/README.md) is AXIS minus the labeled plane.

## Model

Coordinates are **normalized `[0, 1]` doubles on both axes** (`AxisPoint`, in
`presentation/slide/content/parts/SlideContentTypes.java`). `(0,0)` is the
low/low corner — **bottom-left as rendered**, so the editor surface and the
board both pass `invertY: true`. Distance is Euclidean in that normalized
space, so on a non-square rendered plane the accepted region is visually an
ellipse; the editor and board render near-square and draw tolerance circles in
the same space, so what the author sees is what is graded.

`AxisContent` carries the four endpoint labels, `items` (`AxisItem(id, label,
image, color)`), `correctPositions` (itemId → target; the answer key, never
sent to clients), a single per-slide `tolerance`, and `scoreMode` fixed to
`INSIDE_RADIUS` with no authoring knob. The answer is
`AxisAnswer(Map<String, AxisPoint> placements)`.

`AxisConfigView` is the participant-safe projection and sends only
`AxisItemView(id, label)` — never `correctPositions` or `tolerance`, and not
yet the item's `image`/`color` (see [follow-ups](#open-follow-ups)).

## Invariants

1. **Key consistency** — `correctPositions` is keyed only by ids of live `items`; the editor's remove op drops the entry, the same invariant Grid keeps for `correctCells`.
2. **Normalized bounds** — every authored target and submitted placement is finite and within `[0, 1]`; `tolerance` is normalized to `0.02 – 0.5`. Answer-path enforcement is `LiveSessionAnswerService.validateAxis`.
3. **Answer-key privacy** — `correctPositions`/`tolerance` never appear in `AxisConfigView` or any pre-reveal event.
4. **Collect-only is legitimate** — an empty `correctPositions` grades `false` for everyone, making the slide an unscored opinion plane. The editor nudges with an advisory footer but does not block.

Grading (`RoundEvaluator.gradeAxis`) is all-or-nothing: every keyed item's
placement must land within `tolerance` of its target, or the round grades
`false`. `ParticipantOutcome` carries one boolean, so there is no per-item
outcome channel; `ScoreMode.PARTIAL`/`CLOSEST`/`NEAREST`/`DISTANCE` are
declared but return `false` everywhere in `RoundEvaluator`, and AXIS adds no
knob it cannot honor.

## Live pipeline

### Live tally — quantized buckets

Exact coordinates cannot be histogram keys, so `AnswerTallyKeys.optionKeys`
quantizes each placement into a 10 × 10 grid at key-derivation time — one
`itemId@bx,by` key per placement, with `AXIS_TALLY_BUCKETS = 10`. Bucket
indices are small ints, so `"bx,by"` is exactly Grid's cell-id grammar and the
whole existing pipeline applies unchanged: the `@` separator, `TallyStore`
HINCRBY, the orchestrator's resubmit reconciliation (deterministic derivation
makes resubmits correct for free), `TallyUpdated`, and the snapshot's
`optionTally` for late joiners.

The bucket count is not a request-DTO bound, so it does not flow through
`generate-validation`: the frontend mirrors it as a constant pointing back at
`AnswerTallyKeys.AXIS_TALLY_BUCKETS`. SCALES shares the same constant.

Durable `RoundResult.optionCounts` is **empty** for AXIS (`describeChoice`
returns null for map-shaped answers), so the reveal-time guard in
`liveSessionSlice.ts` — durable counts only overwrite the live tally when
non-empty — keeps the bucket heat on screen through reveal. Same seam GRID sits
on ([decisions taken](../../decisions/README.md#decisions-taken)).

### Whole-answer resubmit override

Some payloads are one whole artifact rather than an MCQ-style incremental pick,
so the deck's default `maxSelections` must not freeze the first submission.
`LiveSessionAnswerService` zeroes it for those kinds before delegating:

```java
int effectiveMaxSelections = request.payload() instanceof GridAnswer
        || ... instanceof AxisAnswer   || ... instanceof PlaceOnImageAnswer
        || ... instanceof ScalesAnswer || ... instanceof MatchingAnswer
        || ... instanceof AllocationAnswer || ... instanceof DrawingAnswer
        || ... instanceof FollowUpAnswer || ... instanceof TextAnswer
        ? 0 : maxSelections;
```

The rule is uniform: **resubmits overwrite, last write before the round closes
wins.** Whether a board *offers* resubmission is a separate, per-board UI
decision — Axis, Scales and Allocation do, Place-on-Image deliberately locks on
submit.
This is the single statement of the override; the other kinds' docs link here.

## Editor UX

`hooks/useAxisEditor.ts` sits over `useSlideEditor(deckId, slideId, "AXIS")`.
Item ops (add/remove/reorder, label, color, image) come from the shared
`useItemBankEditor`, re-exposed under Axis's names; removal drops the item's
`correctPositions` entry. `setTargetPosition` and `setTolerance` are immediate +
flushed (structural, like Grid's cell assignment). Bounds:
`MIN/MAX_AXIS_ITEMS = 1 / 6` (one per palette color), `AXIS_TOLERANCE_MIN/MAX/
DEFAULT = 0.02 / 0.5 / 0.1`, `AXIS_LABEL_MAX = 80` on the endpoint inputs —
note `ItemBankRow` applies its own hardcoded `maxLength={100}` to item labels.

`SlideContent/AxisSlideContent/` is two components. `AxisSlideContent.tsx`
composes the side-by-side Plane and Items `SettingsCard`s, holds the advisory
"set a target for every item" footer, and puts the "N of M placed" counter and
the shared `ToleranceField` in the Plane card's header.
`AxisPlaneEditor.tsx` overlays the four endpoint-label pills *inside* the
plane's edges so the plane claims all the room, and places on press/drag with
the target committed on release. Placed markers are numbered dots in the item's
resolved color, each drawing its tolerance circle so the accepted region is
visible while tuning; they drag directly and tap to toggle their row's arming.
The pointer-free path is the row menu's "Set target" (seeds the plane centre),
reachable by keyboard because focusing a row's label opens its menu.

Everything else — rows, markers, pointer bookkeeping, tolerance field, popover
machinery, composer state — is the
[shared placement kit](../deck-editor/README.md#shared-placement-kit). Axis
renders `SortableItemBankRow` with `type="placement"` and `hasTarget`; the
row's placement arm builds its own "Set target" / "Clear target" menu action,
so there is no Axis-specific row component.

## Board UX

`AxisBoardContent.tsx` (`SessionBoard/content/`) serves participant and
projector off the same `mode`/`interactive` props.

- **Drag primary, tap-to-place fallback.** A bank of `DraggableChip`s (seeded shuffle by slide id) drops onto the `PlacementSurface`; dropping a placed chip back on the `BoardBank` un-places it. Tap-hold-tap is the small-screen / keyboard / AT path, and arrow keys nudge a focused chip in 2 % steps.
- The draft, held/submitted state, and all drag/tap/nudge handling live in the shared `useBoardPlacement` hook (`content/useBoardPlacement.ts`), parameterized by `invertY` and `lockOnSubmit` — the same hook the Place-on-Image board runs on. Axis sets `lockOnSubmit: false`, so the button flips to "Update answer".
- Each chip renders a `MarkerBadge`, composing the badge's own `.anchored`/`.anchoredLabeled` classes so a labeled chip's **disc**, not its pill, stays on the graded point. Submit bar and unplaced-item row are the shared `BoardSubmitBar`/`BoardBank`.
- **liveResults / results** — a 10 × 10 translucent heat overlay from the bucket keys via `content/answerTally.ts`, plus the viewer's own placed chips; on `results`, the own-outcome banner via `OutcomeBanner`/`findViewerOutcome`. No correct-target overlay yet.
- **Projector** — plane + heat only.

## Open follow-ups

- **F1 — structured answer-key reveal.** A typed per-kind field on `ResultsRevealed` so boards can overlay targets + tolerance circles post-reveal. The blocker is only that `correctOption` is `String`-shaped. **Shared seam with GRID and SCALES** — spec it once for all three.
- **F2 — raw-placement scatter.** True scatter needs raw payloads on an event or a host-side read of round results; the bucket heat is the fallback (`Charts/registry.ts` has `AXIS: { supportedViz: ["HEATMAP", "NONE"], implemented: false }`).
- **Item image/color reaching players.** `AxisItem` carries optional `image`/`color` in the authoring surface, but `AxisConfigView` still sends only `id`/`label`.
- **Per-item tolerance override** (`Map<String, Double>`, additive).
- **Partial credit** — needs scoring machinery `RoundEvaluator` doesn't have.
