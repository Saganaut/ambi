# Allocation Slides

An **ALLOCATION slide** hands players a fixed pool of points to split across a
set of options — a resourcing/priority-weighting question rather than a single
pick. Structurally it reuses MCQ's `McqOption` records (color, image, label)
for the options and Scales' answer-key shape (per-option target + a single
per-slide tolerance) for grading.

## Model

`presentation/slide/content/AllocationContent.java`: `options` (`McqOption`
list), `correctAllocations` (optionId → target points; the answer key, never
sent to clients), `totalPointsToAllocate` (the pool every player splits), and
a single per-slide `tolerancePerOption`, in points.

The answer is `AllocationAnswer(Map<String, Integer> allocations)` — one whole
map per submission, not one incremental pick. `RoundEvaluator.gradeAllocation`
is all-or-nothing: every keyed option's allocation must land within
`± tolerancePerOption` of its target, defaulting an unkeyed submission entry to
`0`. An empty `correctAllocations` grades `false` for everyone, making the
slide an unscored opinion poll (Scales' collect-only precedent).

`AllocationConfigView` is the participant-safe projection carried on
`SlideView.allocation`: the options and `totalPointsToAllocate`. It never
carries `correctAllocations` or `tolerancePerOption` — both are grading-only
until reveal. `totalPointsToAllocate` *does* travel, because the board needs
it to drive the pool counter.

The answer key ships at reveal instead, on `AllocationTargetView(optionId,
points, tolerance)` — one view per keyed option, produced by
`AllocationTargetView.from(content)` walking `options` in authored order (so
disclosure order matches the board); an unkeyed option has no target, and a
stale key naming no option is dropped. It carries only the key: label, colour
and image are already on `AllocationConfigView`, so the board resolves them by
`optionId`. It rides `ResultsRevealed.allocationTargets` and, for a client that
joins mid-reveal, the matching field on `SessionSnapshotResponse` — both are
populated only once the round enters `REVEAL_RESULTS`, `null` otherwise.

## Invariants

1. **Key privacy** — `AllocationConfigView` never carries `correctAllocations`
   or `tolerancePerOption`; both stay server-side until `AllocationTargetView`
   discloses them at reveal.
2. **Exact-sum wire bound** — `LiveSessionAnswerService.validateAllocation`
   requires every submitted key to be an option on the slide, every value in
   `[0, totalPointsToAllocate]`, and the values to sum to
   `totalPointsToAllocate` exactly (plain `ValidationException` messages, no
   new error codes). Unlike the partial-map kinds (Grid, Axis, Matching), the
   exact sum is required — splits are only comparable across participants when
   everyone spent the same pool, and grading against `correctAllocations`
   assumes it.
3. **Key consistency** — `removeOption` in `useAllocationEditor` drops the
   removed option's `correctAllocations` entry, so a stale key can't keep the
   slide "scored" against an option the author deleted.
4. **Authoring bounds** — `MIN_ALLOCATION_OPTIONS = 2` / `MAX_ALLOCATION_OPTIONS
   = 6`; `ALLOCATION_TOTAL_MIN = 1`; `tolerancePerOption` is clamped to
   `[0, totalPointsToAllocate]` on every pool or tolerance edit.
5. **Zero-point entries are kept on purpose** — the live tally key for an
   allocated-but-zero option is still emitted, so an option's keys sum to the
   respondent count (see Seams below).

## Seams

- **Editor** — `hooks/useAllocationEditor.ts` sits directly over
  `useSlideEditor(deckId, slideId, "ALLOCATION")` and owns the option array
  itself (add/remove/reorder, label/color/image patches, and the
  `correctAllocations` key edits) — it does **not** route through the shared
  [`useItemBankEditor`](../deck-editor/README.md#editor-commit-pattern) the
  way Scales/Axis/Place-on-Image do. Pool edits (`scheduleTotalPoints`) never
  rewrite already-keyed answers — a mid-typing total would destructively clamp
  them — so a key sum that drifts from the pool is left for the editor UI to
  surface rather than auto-corrected.
- **Live tally key format** — `AnswerTallyKeys.optionKeys` emits one
  `optionId@points` key per allocated option, zero-point entries included, so
  each option's keys sum to the round's respondent count (the same
  `GRID_KEY_SEPARATOR = "@"` grammar Grid/Axis/Scales/Matching/Ranking use, with
  the awarded points in the slot instead of a bucket or cell id).
- **Whole-answer resubmit override** — `AllocationAnswer` joins the
  [whole-answer resubmit override](../axis-slides/README.md#whole-answer-resubmit-override):
  the deck's default `maxSelections` is zeroed for it, so a resubmission
  overwrites (last write before the round locks wins) rather than freezing on
  the first submit.
- **Reveal** — `AllocationTargetView.from(content)`, carried on
  `ResultsRevealed.allocationTargets` and mirrored onto
  `SessionSnapshotResponse.allocationTargets` for a late joiner. On the
  frontend, `liveSessionSlice.ts` keeps `allocationTargets` in state: seeded
  from the snapshot for late joiners, set from the `ResultsRevealed` event
  (mirrored into both `results.allocationTargets` and the snapshot-seam field,
  so the board can read from either), and nulled on every `RoundStarted` /
  `RoundRestarted` — the same seam Place-on-Image's `placeTargets` sits on.
- **Board** — `AllocationBoardContent.tsx` covers every moment off one
  component, switched by `mode`: `prompt` is one point-entry input per option
  (round-local draft, submit only enabled once the whole pool is spent,
  re-sendable until the round locks); `liveResults`/`results` aggregate the
  `optionId@points` tally into per-option share/average bars via
  `tallyTotalsBySlot`; `results` additionally discloses a `Key n ±t` pill and a
  track tick per keyed option from `allocationTargets`, plus the viewer's own
  outcome banner (`OutcomeBanner` / `findViewerOutcome`).

## Open follow-ups

- **Structured answer-key reveal** is already in place for Allocation (unlike
  the shared gap Scales/Axis/Grid still have — F1 in the
  [axis doc](../axis-slides/README.md#open-follow-ups)); no further work
  needed there.
- **Post-round results chart** — `resultsRegistry` maps ALLOCATION to
  `BarChart` (♻️ reuses an existing chart), but it needs a backend aggregation
  step: `RoundEvaluator.describeChoice` doesn't cover `AllocationAnswer`, so
  `RoundResult.optionCounts` is empty for Allocation rounds once a round
  closes — see [results-visualization](../results-visualization.md).
- **Per-option tolerance override** (`Map<String, Integer>`, additive) — today
  one `tolerancePerOption` applies to every keyed option, Scales' precedent.
- **Partial credit** — grading is boolean-only (`RoundEvaluator` has no partial
  scoring machinery); a near-miss split scores identically to a wild one.
