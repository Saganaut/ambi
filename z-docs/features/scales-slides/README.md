# Scales Slides — continuous slider redesign

A **SCALES slide** asks players to rate one or more statements on a labeled
left↔right scale (e.g. *Strongly disagree → Strongly agree*). Today the kind
is discrete: authors set `min`/`max` boundary values **and a `step`**, the
editor renders tappable tick dots, and each statement's correct answer must
land on a tick. This redesign makes the scale **continuous**: the author (and,
on the live board, the player) drags a marker anywhere along the track between
the two ends, and the pointer position derives the numeric value. `step` is
removed from the model; the authored numeric `min`/`max` endpoints stay.

SCALES is the 1-D sibling of [AXIS](../axis-slides/README.md) — the same
continuous-placement problem one dimension down — so nearly every decision
below reuses an AXIS mechanism verbatim. This doc follows the axis spec's
structure and is written to be executed by an implementing agent without
further design work.

**Status: implemented** (stages 1–3 landed; the [implementation
checklist](#implementation-checklist) tracks each commit). The continuous
model + editor, the answer pipeline (validation, grading, tally keys, the
participant-safe view), and the live board (`BoardQuestion.tsx` now renders
`ScalesBoardContent` for `SCALES`) are all in place. The named
[follow-ups](#follow-ups-named-out-of-v1) — structured answer-key reveal,
raw-value distribution charts, per-statement tolerance, partial credit —
remain out of v1.

## Design decisions

Three decisions shape everything else; each follows an existing precedent.

### D1 — Answer wire shape: normalized positions, not scale-unit values

`ScalesAnswer` changes from `Map<String, Integer> ratings` to
`Map<String, Double> positions` — the **normalized track position `[0, 1]`**
per statement (0 = left end), not the scale-unit value.

- `AnswerTallyKeys.optionKeys(AnswerPayload)` is **content-free by design**:
  `LiveSessionOrchestrator.submitAnswer` calls it twice on the lock-free Redis
  path (back out the prior payload's keys, apply the new ones) with no slide
  content in scope. Bucketing a scale-unit value would need `min`/`max`,
  forcing either an `optionKeys(payload, content)` signature change into the
  orchestrator or a Mongo read on the hot submit path. AXIS hit the identical
  problem with continuous coordinates and solved it by normalizing on the
  wire (`AxisAnswer.placements`); SCALES inherits that answer.
- The rename is free: **nothing produces `ScalesAnswer` today** (no board
  exists), answers live only in ephemeral Redis (`RedisJsonCodec` disables
  `FAIL_ON_UNKNOWN_PROPERTIES`), and `RoundResult` never persists payloads
  (only `describeChoice` strings, which are `null` for map-shaped kinds).
- Field name `positions` follows the payload-names-the-gesture precedent
  (`AxisAnswer.placements`, `AllocationAnswer.allocations`); `values` would
  invite confusion with the scale-unit `correctValues`.

Scale units remain the human-facing currency everywhere: `correctValues`
stays `Map<String, Double>` in scale units, and every readout renders
`min + p · (max − min)`.

### D2 — Tolerance stays in scale units; bounds are fractions of the span

Grading keeps its shape — `|answerValue − target| ≤ tolerance`, with
`tolerance` stored in scale units on `ScalesContent`. On a continuum an exact
match is measure-zero, so a scored slide needs a positive tolerance. That is
enforced where the codebase enforces all authoring bounds — **the editor**
(no content record carries bean validation today; grid/axis doctrine) — via
new constants in `useScalesEditor.ts`, expressed as fractions of the authored
span `(max − min)`:

```ts
const SCALES_TOLERANCE_MIN_FRACTION = 0.02; // 2 % of the span
const SCALES_TOLERANCE_MAX_FRACTION = 0.5;  // half the track
const SCALES_TOLERANCE_DEFAULT_FRACTION = 0.1;
```

`setTolerance` becomes immediate + clamped + flushed (the axis pattern,
replacing today's debounced `scheduleTolerance`), and `min`/`max` edits
re-clamp the stored tolerance in the same commit. `buildDefaultContent`
defaults `tolerance: 0.4` (10 % of the default 1–5 span) instead of today's
`0`.

### D3 — Live tally: reuse the AXIS bucket quantization

One tally key per answered statement — `statementId@b` where
`b = min(floor(p · AXIS_TALLY_BUCKETS), AXIS_TALLY_BUCKETS − 1)` — reusing
`AnswerTallyKeys`' existing `bucket(double)` helper and
`AXIS_TALLY_BUCKETS = 10` constant. A single small int after `@` splits
unambiguously under the existing `GRID_KEY_SEPARATOR` grammar (it is a strict
subset of grid's `"r,c"` suffix). Durable `RoundResult.optionCounts` stays
empty for SCALES (`describeChoice` already returns `null` for map-shaped
answers), so reveal keeps the live bucket tally on screen through the same
[open-decisions §D5](../../live-session-open-decisions.md) seam GRID and AXIS
sit on.

## Model

The content record (`presentation/slide/content/ScalesContent.java`) drops
`step`; everything else keeps its meaning:

```java
public record ScalesContent(
    double min,                        // left-end value of the scale
    double max,                        // right-end value of the scale
    String leftLabel,                  // label rendered at the left end
    String rightLabel,                 // label rendered at the right end
    List<ScaleItem> items,             // statements players rate
    Map<String, Double> correctValues, // statementId → target, SCALE UNITS — the answer key, never sent to clients
    double tolerance                   // ± margin in scale units (editor keeps it within 2–50 % of the span)
) implements ScorableContent {
  @Override public SlideType contentType() { return SlideType.SCALES; }
}
```

Update the record Javadoc: the runtime answer is now `Map<String, Double>` of
**normalized positions** (D1), and the tolerance note should name the
editor-enforced fraction bounds (D2).

Containment (verified): no backend seeder, test, or service constructs
`ScalesContent` — the record file holds the only constructor reference — so
removing the component is a one-file backend change plus codegen.

### Participant-safe view

New `session/event/dto/ScalesConfigView.java`, cloned from `AxisConfigView`'s
shape and privacy doctrine, wired as a per-kind field on `SlideView` next to
`axis`:

```java
public record ScalesConfigView(
    double min, double max,
    String leftLabel, String rightLabel,
    List<ScaleItemView> items) {           // ScaleItemView(id, label)
```

It never carries `correctValues` **or `tolerance`** — both are grading-only
knowledge pre-reveal. `min`/`max` **do** travel (unlike axis tolerance): the
board needs them to render the scale-unit readout, and they are not
answer-key material. Only `SlideView.from(...)` constructs the record
(verified), so the added component is contained.

### Answer payload

`session/answer/payload/ScalesAnswer.java`, wire discriminator
`"ScalesAnswer"` (unchanged — already registered in `AnswerPayload`'s
`@JsonSubTypes` + `permits`):

```java
/** Normalized track position per statement (statementId → [0, 1]), 0 = left end. */
public record ScalesAnswer(Map<String, Double> positions) implements AnswerPayload {
  @Override public SlideType slideType() { return SlideType.SCALES; }
}
```

### Registration points

SCALES is an existing kind, so the sealed-hierarchy registrations
(`SlideType`, `SlideContent`'s three synchronized entries, `ScorableContent`,
`AnswerPayload`) are already in place. The redesign touches only:

- `ScalesContent.java` — drop `step`.
- `ScalesAnswer.java` — `ratings: Map<String,Integer>` →
  `positions: Map<String,Double>`.
- `SlideView.java` — new nullable `scales` field + `instanceof ScalesContent`
  branch in `from(...)`; extend the "never carries the answer key" Javadoc.
- `RoundEvaluator.gradeScales` — denormalize before comparing (see
  [Grading](#grading)).
- `LiveSessionAnswerService` — new `validateScales` branch + the
  whole-map resubmit override (see [Live pipeline](#live-pipeline)).
- `AnswerTallyKeys.optionKeys` — SCALES branch (D3).

## Invariants

1. **Key consistency** — `correctValues` is keyed only by ids of live
   `items`; editor structural ops maintain this (removing a statement drops
   its target — already implemented in `useScalesEditor.removeStatement`).
2. **Normalized wire bounds** — every submitted position satisfies
   `0 ≤ p ≤ 1` and is finite; enforcement lives in `validateScales`.
3. **Authoring bounds** — `min < max` is kept true by the endpoint steppers'
   existing disable logic; `tolerance` stays within 2–50 % of the span,
   re-clamped whenever `min`, `max`, or the tolerance itself changes (D2).
4. **Answer-key privacy** — `correctValues`/`tolerance` never appear in
   `ScalesConfigView` or any pre-reveal event. (Post-reveal disclosure is the
   shared follow-up F1 in the [axis spec](../axis-slides/README.md).)
5. **Collect-only is legitimate** — an empty `correctValues` map grades
   `false` for everyone and makes the slide an unscored opinion poll (the
   existing SCALES convention; the editor footer already says so).

## Grading

`RoundEvaluator.gradeScales` keeps its loop-over-answer-key shape; the only
change is denormalizing the wire position with content in scope:

```java
private static boolean gradeScales(ScalesContent content, ScalesAnswer answer) {
    Map<String, Double> key = content.correctValues();
    Map<String, Double> positions = answer.positions();
    if (key == null || key.isEmpty() || positions == null) return false;
    double span = content.max() - content.min();
    for (Map.Entry<String, Double> e : key.entrySet()) {
        Double p = positions.get(e.getKey());
        if (p == null
                || Math.abs(content.min() + p * span - e.getValue()) > content.tolerance()) {
            return false;
        }
    }
    return true;
}
```

- **All-or-nothing boolean**, as everywhere in `RoundEvaluator`: every keyed
  statement must land within tolerance. Partial credit stays an unimplemented
  seam.
- A legacy scored slide with `tolerance: 0` simply grades `false` until the
  author re-edits it (the editor then clamps the tolerance into bounds) —
  acceptable at dev stage, see [Migration](#migration--compatibility).
- `describeChoice` and `correctKey` need **no changes** — their null paths
  already cover map-shaped answers, which is also what keeps the live tally
  on screen at reveal (D3).

## Live pipeline

### Answer validation

New `LiveSessionAnswerService.validateScales`, mirroring `validateAxis`:
`positions` non-null and non-empty ("at least one statement must be rated"),
every key an item id present on the slide, every value finite and within
`[0, 1]` ("rating is not on the scale"). The server accepts partial maps
(grid/axis precedent — ≥ 1 entry); the board gates full completion
client-side.

SCALES also joins the whole-map resubmit override next to GRID and AXIS —
a scales submission is one whole ratings map, so the deck default
`maxSelections = 1` must not lock the first submission:

```java
int effectiveMaxSelections = request.payload() instanceof GridAnswer
        || request.payload() instanceof AxisAnswer
        || request.payload() instanceof ScalesAnswer ? 0 : maxSelections;
```

### Live tally

Per D3, `AnswerTallyKeys.optionKeys` gains a SCALES branch:

```java
if (payload instanceof ScalesAnswer scales && scales.positions() != null) {
    return scales.positions().entrySet().stream()
            .map(rating -> rating.getKey() + GRID_KEY_SEPARATOR + bucket(rating.getValue()))
            .toList();
}
```

Update the `AXIS_TALLY_BUCKETS` Javadoc to say the constant now quantizes
both AXIS placements and SCALES positions (keeping the name avoids churning
the documented frontend mirror; renaming to `TALLY_BUCKETS` is optional and
not required). The deterministic derivation keeps resubmit reconciliation
correct for free, exactly as for AXIS.

### Reveal

No new events. Durable `optionCounts` stays empty for SCALES, so the
reveal-time guard in `liveSessionSlice.ts` keeps the live bucket heat on
screen — the GRID/AXIS seam, unchanged.

## Editor UX

### Hook — `useScalesEditor.ts`

- `ScalesQuestionView` drops `step`; `scheduleStep` is removed.
- `scheduleTolerance` is replaced by `setTolerance(value)` — immediate,
  clamped to `[0.02 · span, 0.5 · span]`, flushed (the `useAxisEditor`
  pattern). `scheduleMin`/`scheduleMax` switch to the function-form patch and
  re-clamp the stored tolerance against the new span in the same commit.
- Export `SCALES_TOLERANCE_MIN_FRACTION` / `MAX_FRACTION` /
  `DEFAULT_FRACTION` (D2).
- Everything else survives unchanged: statement ops, min/max/label
  scheduling, and the per-statement `scheduleCorrectValue` /
  `commitCorrectValue` / `clearCorrectValue` trio (`correctValues` stays in
  scale units).

### Components — `SlideContent/ScalesSlideContent/`

- **`ScaleStatementEditable.tsx` — the heart of the redesign.** Delete the
  tick-dot loop, the `onTrack` check, and the off-track fallback branching.
  The statement's track becomes a continuous drag surface (the 1-D analogue
  of `AxisPlaneEditor`'s mechanics):
  - `positionFromClient(clientX)` →
    `clamp01((clientX − rect.left) / rect.width)` via
    `getBoundingClientRect`; `value = min + p · span`. Pointerdown places
    immediately, pointermove drags (`scheduleCorrectValue`), pointerup
    commits (`commitCorrectValue`, which flushes).
  - The marker is a real `<button role="slider">` with
    `aria-valuemin={min}`, `aria-valuemax={max}`, `aria-valuenow`, and a
    formatted `aria-valuetext`. ArrowLeft/ArrowRight nudge by 2 % of the span
    (`KEYBOARD_NUDGE_STEP = 0.02`, the axis-board precedent); Home/End jump
    to `min`/`max`.
  - A tolerance band — an absolutely positioned span centered on the marker,
    width `2 · tolerance / span` of the track — makes the accepted region
    visible while tuning (the 1-D analogue of the axis tolerance circle:
    what the author sees is what is graded).
  - A scale-unit readout renders next to the track via `formatScaleValue`
    (round to 2 decimals, trim trailing zeros; integers render bare).
  - The `NumberInput` "Answer" field stays as the always-available
    precise/accessible entry (bounded by `min`/`max`, no `step` prop), with
    the existing X clear button. "Tap the selected dot to clear" dies with
    the dots — clearing is the X button only. The "Set answer" button for
    unscored rows stays, seeding the midpoint `(min + max) / 2` (no longer
    rounded).
- **New `scaleValue.ts` + `scaleValue.test.ts`** (same folder): `clamp01`,
  `positionToValue`, `valueToPosition`, `formatScaleValue` — unit-testable
  and conceptually shared with the board.
- **Delete `scaleTicks.ts` and `scaleTicks.test.ts`** — nothing else imports
  them (verified).
- `ScalesSlideContent.tsx` — remove the `step` local mirror and the whole
  **Advanced disclosure** (its only remaining tenant, tolerance, gets
  promoted): an always-visible tolerance row in the Scale card using a native
  `<input type="range">` (the `AxisSlideContent` tolerance-slider precedent),
  spanning 2–50 in integer percent, labeled `Tolerance · ±{scale units}`.
  Pass `tolerance` down to each statement row for the band; stop passing
  `step`.
- `ScalePreview.tsx` — drop the `step` prop and the `scaleTicks` import;
  render a fixed decorative track (line + two end dots) with caption
  `{min} → {max}`.
- `ScaleEndpointCard.tsx` — **unchanged**: the ±1 endpoint steppers set
  boundary values, orthogonal to step removal.
- `ScalesSlideContent.module.css` — retire the tick/dot classes; add marker,
  tolerance-band, drag-track, and tolerance-row styles.

### Registration

- `slideContent.ts` — `buildDefaultContent` case `"SCALES"`: remove
  `step: 1`, default `tolerance: 0.4` (D2).
- `deckMockData.ts` — drop `step: 1` from the SCALES fixture; `tolerance: 1`
  stays (25 % of the 1–5 span, in bounds); optionally make one target
  non-integer (e.g. `4.5`) to exercise doubles end-to-end.
- Codegen after each backend commit: run `generate-api`,
  `generate-validation`, `generate-enums` **individually** (the combined
  `npm run generate` aborts on a known dev-controller issue). Expected
  effects: `deckApi.gen.ts` `ScalesContent` loses `step`;
  `liveSessionApi.gen.ts` `ScalesAnswer` gains `positions` (dropping
  `ratings`) and `SlideView` gains `scales?: ScalesConfigView`. Never
  hand-edit the `.gen.ts` files.

## Board UX

New `ScalesBoardContent.tsx` (+ `module.css` + test) in
`SessionBoard/content/`, wired as `case "SCALES"` in `BoardQuestion.tsx`
(replacing the placeholder fall-through). One component serves participant
and projector via the established `mode`/`interactive` props. Template:
`GridBoardContent`'s scaffolding + `AxisBoardContent`'s resubmit/nudge/heat
idioms.

- **Data**: `slide.scales` (`min`, `max`, `leftLabel`, `rightLabel`,
  `items`); `useSessionConnection().sendAnswer`; `useLiveSessionQuery()` for
  `optionCounts`, `results`, and the viewer's participant id. Statements
  render in authored order — order is presentational for SCALES, so no
  seeded shuffle (unlike item banks).
- **Answer surface** (`mode === "prompt"`, interactive): one row per
  statement — label, left/right anchor captions (empty labels fall back to
  the `min`/`max` numbers, the editor's pattern), and a native
  `<input type="range" min={0} max={1} step="any">` bound to a round-local
  draft `Record<statementId, number>` (normalized), reset on `slideId`
  change. Native range = free ARIA slider semantics + keyboard support; add
  `aria-label` (the statement label) and `aria-valuetext` (the scale-unit
  readout, `formatScaleValue` rounding).
- **Touched gating**: sliders render at the 0.5 midpoint, but a statement
  only enters the draft once the player actually moves or commits it (a
  `touched` set). Submit stays disabled until every statement is touched —
  the grid `allPlaced` parity, and it avoids silently submitting midpoint
  bias.
- **Submit/resubmit**:
  `sendAnswer(slideId, { answerType: "ScalesAnswer", positions })`; resubmit
  allowed until lock (the `maxSelections = 0` override) — the axis pattern:
  button flips to "Update answer" with an "Answer submitted ✓" note; the
  surface never freezes except on `mode === "results"`.
- **liveResults / results**: a 10-bucket heat strip under each statement's
  track, aggregated from the `statementId@b` tally keys by a scales-local
  `statementBucketTotals(optionCounts)` helper (split on `"@"`, group by
  statement id, normalize intensity per statement). Mirror the bucket count
  as `SCALES_TALLY_BUCKETS = 10` with the standard keep-in-sync comment
  pointing at `AnswerTallyKeys.AXIS_TALLY_BUCKETS` (or import the constant
  the axis board already mirrors — implementer's choice, with a comment
  either way).
- **results**: the own-outcome banner from `results.outcomes` (grid/axis
  wording). No target reveal in v1 — that is the **shared follow-up F1** in
  the [axis spec](../axis-slides/README.md).
- **Projector** (non-interactive): tracks + heat strips only, no sliders or
  submit.

## Results visualization

The [results-visualization](../results-visualization.md) chart-fit matrix
row updates to payload `Map<id, Double>` (normalized positions): the
per-statement bucket strips on the live board are the v1 view, and the
post-round Likert diverging bar becomes a bucketed-histogram variant (the
discrete agree/disagree fan no longer falls out of the model for free).

## Migration & compatibility

Dev-stage project; **no migration script**.

- **Removed `step` on Mongo read** — decks persist via Spring Data MongoDB's
  `MappingMongoConverter` (no custom conversions registered); document fields
  with no matching record component are ignored on read, so legacy `step`
  values are harmless residue. *Implementation step: verify once against a
  pre-change deck before relying on this.* On the HTTP path, Spring Boot's
  default Jackson has `FAIL_ON_UNKNOWN_PROPERTIES` off (no
  `spring.jackson.deserialization` override in `application.properties`), so
  a stale client still sending `step` is also ignored.
- **`ratings` → `positions`** — no durable store holds `ScalesAnswer`
  (Redis-only, and `RedisJsonCodec` disables unknown-property failures;
  `RoundResult` stores no payloads). Only a live session in flight across the
  deploy could notice — irrelevant in dev.
- **Seed data** — `SampleDataSeeder` builds MCQ decks only (verified); no
  SCALES slides exist in seed data. `./scripts/seed-sample-data.sh` covers
  hand-authored stale decks if needed. `deckMockData.ts` is the only SCALES
  fixture anywhere and is updated in stage 1.
- **Legacy `tolerance: 0` scored slides** — grade `false` until the author's
  next edit re-clamps the tolerance into bounds; integer targets (doubles all
  along) are unaffected.

## Validation bounds

Following the codebase's actual split — structural caps are frontend editor
constants; runtime safety is answer-path validation:

| Constant | Value | Where enforced |
| --- | --- | --- |
| `MIN_SCALE_STATEMENTS` / `MAX_SCALE_STATEMENTS` | 1 / 10 (unchanged) | `useScalesEditor.ts` |
| `SCALES_TOLERANCE_MIN/MAX/DEFAULT_FRACTION` | 0.02 / 0.5 / 0.1 of the span | `useScalesEditor.ts` (`setTolerance` clamp + min/max re-clamp) |
| `min < max` | — | endpoint stepper disable logic (existing) |
| Position bounds (`[0, 1]`, finite) | — | `LiveSessionAnswerService.validateScales` |
| Tally buckets | 10 (`AXIS_TALLY_BUCKETS`, shared) | `AnswerTallyKeys` (backend) + mirrored board constant |

## Implementation checklist

Staged commits, mirroring how AXIS landed. Each commit follows the full
feature workflow (implement → commit via conventions → review). Stages 1–4
are ✅ complete.

1. ✅ **`feat(deck)` — content model + editor redesign.**
   `ScalesContent` minus `step` (Javadoc rewrite) → codegen (three individual
   scripts) → `slideContent.ts` + `deckMockData.ts` defaults →
   `useScalesEditor.ts` (drop step surface; `setTolerance` + fraction
   constants; re-clamp on min/max) → `ScalesSlideContent.tsx` (no Advanced
   disclosure; tolerance slider row) → `ScaleStatementEditable.tsx`
   (continuous drag marker, `role="slider"`, nudge keys, tolerance band,
   readout) → `ScalePreview.tsx` (continuous track) → new `scaleValue.ts` +
   test → delete `scaleTicks.ts` + test → CSS. Tests: `scaleValue.test.ts`
   (mapping, clamping, formatting), editor-hook re-clamp behavior.
2. ✅ **`feat(session)` — answer pipeline.** `ScalesAnswer.positions` (D1);
   `validateScales` + the `maxSelections = 0` override; the
   `AnswerTallyKeys` SCALES branch + Javadoc (D3);
   `RoundEvaluator.gradeScales` denormalizing (above); new
   `ScalesConfigView` + `SlideView.scales`; codegen. Tests:
   `RoundEvaluatorTest` (inside/outside/boundary `==` tolerance, missing
   statement, collect-only), `LiveSessionAnswerServiceTest` (resubmit
   override; empty / unknown-id / out-of-bounds / non-finite rejected),
   `AnswerTallyKeysTest` (one key per statement, `p = 1.0` clamp),
   `SessionEventsTest` (scales view carried; `correctValues`/`tolerance`
   absent).
3. ✅ **`feat(session)` — live board.** `ScalesBoardContent` + CSS + tests;
   `BoardQuestion` case; mirrored bucket constant. Tests (the
   `GridBoardContent.test` harness): touched gating, submit/update flow,
   heat aggregation from bucket keys, read-only projector mode, own-outcome
   banner.
4. ✅ **`docs`** — update this doc's status line, the
   [results-visualization](../results-visualization.md) SCALES row, and any
   glossary drift.

## Follow-ups (named, out of v1)

- **F1 — structured answer-key reveal** (shared with GRID/AXIS): a typed
  per-kind field on `ResultsRevealed` so the board can draw targets +
  tolerance bands post-reveal.
- **Raw-value distribution charts** — mean ± spread or a true histogram per
  statement needs raw positions on a client-readable surface (the SCALES
  analogue of axis follow-up F2).
- **Per-statement tolerance override** (`Map<String, Double>`, additive).
- **Partial credit** — per-statement outcomes need scoring machinery
  `RoundEvaluator` doesn't have; boolean-only today.
