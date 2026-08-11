# Scales Slides

A **SCALES slide** asks players to rate one or more statements on a continuous
labeled scale (e.g. *Strongly disagree → Strongly agree*). The author and the
player drag a marker anywhere along the track; the pointer position derives the
value. There is no `step` and there are no tick dots — the scale is continuous
end to end.

SCALES is the 1-D sibling of [AXIS](../axis-slides/README.md), and reuses its
mechanisms nearly verbatim: normalized wire coordinates, editor-enforced
tolerance bounds, bucket-quantized live tallies.

## Model

`presentation/slide/content/ScalesContent.java`: `min`/`max` (the scale's
endpoint values), `leftLabel`/`rightLabel`, `items` (the statements),
`correctValues` (statementId → target **in scale units**; the answer key, never
sent to clients), and a single per-slide `tolerance`, also in scale units.

**The unit split is the thing to remember.** Answers travel as *normalized*
positions — `ScalesAnswer(Map<String, Double> positions)`, `0` = left end, `1` =
right — while targets and tolerance are authored in *scale units*. Anything
that compares the two denormalizes first: `value = min + p · (max − min)`.
`AnswerTallyKeys.optionKeys` is content-free by design (the lock-free submit
path calls it twice with no slide content in scope), which is why the wire
carries a position rather than a value.

`ScalesConfigView` is the participant-safe projection: `min`, `max`, the two
end labels, and one `ScaleItemView(id, label, imageUrl, color)` per statement.
It never carries `correctValues` or `tolerance` — both are grading-only until
reveal. `min`/`max` *do* travel, because the board needs them for its
scale-unit readout.

## Invariants

1. **Key consistency** — `correctValues` is keyed only by ids of live `items`; `removeStatement` drops the removed statement's target.
2. **Normalized wire bounds** — every submitted position is finite and within `[0, 1]`; enforced by `LiveSessionAnswerService.validateScales`.
3. **Authoring bounds** — `min < max` (kept by the endpoint steppers' disable logic); `tolerance` stays within 2–50 % of the span, re-clamped whenever `min`, `max`, or the tolerance itself changes.
4. **Answer-key privacy** — `correctValues`/`tolerance` never appear in `ScalesConfigView` or any pre-reveal event.
5. **Collect-only is legitimate** — an empty `correctValues` grades `false` for everyone and makes the slide an unscored opinion poll. The editor footer says so; it does not block.

Grading is all-or-nothing: `RoundEvaluator.gradeScales` denormalizes each
answered position and fails the round if any keyed statement lands more than
`tolerance` from its target. On a continuum an exact match is measure-zero, so
a scored slide needs a positive tolerance — a legacy slide with `tolerance: 0`
grades `false` until its next edit re-clamps it.

## Seams

- **Editor** — `hooks/useScalesEditor.ts` owns the bounds: `MIN_SCALE_STATEMENTS = 1`, `MAX_SCALE_STATEMENTS = 6`, and `SCALES_TOLERANCE_MIN/MAX/DEFAULT_FRACTION = 0.02 / 0.5 / 0.1` of the span. Statement add/remove/reorder and the label/color/image patches come from the shared [`useItemBankEditor`](../deck-editor/README.md#editor-commit-pattern); `setTolerance` is immediate + clamped + flushed, and `min`/`max` edits re-clamp the stored tolerance in the same commit.
- **Statement row** — `ScaleStatementEditable.tsx` is a continuous drag surface: `positionFromClient` → `clamp01` → `setCorrectValue`. The marker is a real `<button role="slider">` with arrow-key nudges of 2 % of the span and Home/End jumps; a tolerance band centred on it makes the accepted region visible while tuning, so what the author sees is what is graded. The `NumberInput` "Answer" field stays as the precise/accessible path.
- **Value helpers** — `frontend/src/shared/utils/scaleValue.ts` (`clamp01`, `positionToValue`, `valueToPosition`, `formatScaleValue`) is shared between the editor and the board so both render identical readouts.
- **Live tally** — one `statementId@bucket` key per answered statement, quantized with `AnswerTallyKeys.SCALES_TALLY_BUCKETS = 10` — its own constant now, no longer shared with AXIS/PLACE_ON_IMAGE's `PLACEMENT_TALLY_BUCKETS` (which moved to 20 for a finer placement grid; the two resolutions used to be one shared constant and now move independently). The frontend mirrors it as `SCALES_TALLY_BUCKETS` in `shared/utils/tallyBuckets.ts`. Durable `RoundResult.optionCounts` stays empty for SCALES (`describeChoice` is null for map-shaped answers), so the reveal-time guard in `liveSessionSlice.ts` keeps the live bucket heat on screen — the same seam GRID and AXIS sit on ([decisions taken](../../decisions/README.md#decisions-taken)).
- **Resubmit** — a scales submission is one whole ratings map, so it joins the [whole-answer resubmit override](../axis-slides/README.md#whole-answer-resubmit-override).
- **Board** — `ScalesBoardContent.tsx` serves participant and projector off the same `mode`/`interactive` props. One native `<input type="range" step="any">` per statement bound to a round-local normalized draft, with a `touched` set gating submit so a midpoint the player never moved is never submitted as an opinion. `liveResults`/`results` add a 10-bucket heat strip per statement via `content/answerTally.ts`, plus the viewer's own outcome banner.

## Open follow-ups

- **Structured answer-key reveal** (shared with GRID/AXIS — F1 in the [axis doc](../axis-slides/README.md#open-follow-ups)): a typed per-kind field on `ResultsRevealed` so the board can draw targets + tolerance bands post-reveal.
- **Raw-value distribution charts** — mean ± spread or a true histogram per statement needs raw positions on a client-readable surface.
- **Per-statement tolerance override** (`Map<String, Double>`, additive).
- **Partial credit** — per-statement outcomes need scoring machinery `RoundEvaluator` doesn't have; it is boolean-only today.
