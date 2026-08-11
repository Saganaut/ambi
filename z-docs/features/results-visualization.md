# Results Visualization

Which chart suits which slide type, how a result becomes one, and what is still
missing. A per-type map (`resultsRegistry`) records the valid charts for every
question type and the chart family covers them, but only **MCQ, AXIS and
PLACE_ON_IMAGE** are wired end-to-end into the editor UI.

## The pipeline

Every renderer consumes one normalized shape, `ChartDatum[]`
([`Chart.types.ts`](../../frontend/src/shared/components/Charts/Chart.types.ts)):
`{ id, value, text?, color?, imageUrl?, highlight?, isCorrect?, optionType }`.

To chart a new slide type end-to-end, five things must exist — this doubles as
the wiring checklist:

1. **Backend aggregation** into the durable `RoundResult.optionCounts`. Today `RoundEvaluator.describeChoice()` produces a non-null choice only for MCQ, NUMBER and TEXT; every other type needs it extended or a type-specific projection added, or the post-round tally is simply empty.
2. **Adapter** — `adapters/<type>.ts` producing `ChartDatum[]` (model `adapters/mcq.ts`): a `…ToChartData` mapper plus a sample-distribution generator for authoring previews.
3. **Registry entry** in [`registry.ts`](../../frontend/src/shared/components/Charts/registry.ts) with the type's `supportedViz: ChartType[]`, adapter, and sample generator. `getSupportedViz(contentType)` is what an editor section calls to build its viz picker.
4. **Picker metadata** in `vizMeta.tsx` if a new `ChartType` is introduced (icons live in `shared/assets/icons/charts/`).
5. **Dispatcher case** in `ResultsDisplaySwitch.tsx` — the `never` exhaustiveness check flags a missing branch.

**The chart family** — every renderer takes the same `ChartProps`, so any type
slots into the dispatcher and preview pipeline:

| Component | `ChartType`(s) | Shows |
|---|---|---|
| `BarChart` | `BAR_HORIZONTAL`, `BAR_VERTICAL` | proportional bars per option |
| `PieChart` | `PIE`, `DONUT` | share of whole (variant prop) |
| `LineChart` | `LINE` | values as points + polyline |
| `ParetoChart` | `PARETO` | descending bars + cumulative-% line |
| `DotPlot` | `DOT` | lollipop/dot per option |
| `Histogram` | `HISTOGRAM` | gapless bars over binned values (built) |
| `WordCloud` | `WORD_CLOUD` | terms sized by frequency (built; fed by `adapters/words.ts`) |
| `Heatmap` | `HEATMAP` | density grid over a plane or backing image, shaded by bucket share (built; fed by `adapters/placement.ts` — AXIS/PLACE_ON_IMAGE only, see below) |
| `PlaceholderChart` | `DIVERGING_BAR`, `IMAGE_OVERLAY` | "coming soon" stub, each with a thin wrapper (`DivergingBar`, `ImageOverlay`) to grow into — `IMAGE_OVERLAY` is currently unmapped in `resultsRegistry` |
| — | `NONE` | plain non-chart list |

### Two tallies, and they do not line up

This is the single most confusing thing about the area.

- **Ephemeral** — `AnswerTallyKeys.optionKeys` feeds the Redis `tallyStore` behind the live `TallyUpdated` event. It emits keys for **MCQ, GRID, AXIS, SCALES, MATCHING, RANKING, ALLOCATION, FOLLOW_UP and PLACE_ON_IMAGE** — ALLOCATION's are `optionId@points`, zero-point entries included so an option's keys sum to the respondent count — and nothing for NUMBER, TEXT, Q_AND_A or DRAWING.
- **Durable** — `RoundResult.optionCounts` is built from `ParticipantOutcome.choice()` via `describeChoice()`, non-null only for **MCQ, NUMBER and TEXT**.

So the placement kinds have a rich live tally their boards already render, and
**no durable source at all** once the round closes. Charting any type
`describeChoice` doesn't cover needs both a frontend adapter/registry entry
*and* backend aggregation of the raw `Answer.payload` records.

Three types bypass this pipeline entirely, by design: Q&A tokenizes raw
submitted text client-side (`adapters/words.ts`) because it is non-scorable and
has no `RoundResult`; DRAWING carries its results as `ResultsRevealed.drawings`
into a dedicated gallery renderer and is deliberately absent from
`resultsRegistry`; TEXT's live board renders distinct submitted answers with a
List/Word-cloud toggle off the durable tally, but has no post-round chart entry.

## Chart-fit matrix

Status legend: ✅ built & mapped · 🧩 renderer built, not wired into an editor
section · 🚧 mapped, renderer is a placeholder stub · ♻️ mapped, reuses an
existing chart (needs adapter + backend tally) · n/a display-only. "Mapped" =
present in `resultsRegistry`; no non-MCQ type is wired into an editor section.

| Slide type | Response payload | Suitable visualization | Status |
|---|---|---|---|
| **MCQ** | `Set<String>` option ids | Bar / Pie / Donut / Line / Pareto / Dot | ✅ built — the reference implementation |
| **NUMBER** | `double` | Histogram (or dot plot) with the target and its tolerance band marked; bar/pie don't fit continuous data | ✅ Histogram built, no editor UI |
| **TEXT** | `String` | Word cloud, or ranked term bar | ✅ live board built (bypasses this pipeline) |
| **RANKING** | `List<String>` order | Average rank per item, or position distribution as a stacked bar | ♻️ reuses `BarChart`; needs a stacked variant for the distribution view |
| **SCALES** | `Map<id,Double>` normalized positions | Bucketed strip/histogram per statement, or mean ± spread | 🚧 diverging-bar placeholder; live 10-bucket strips on the board — see [scales](scales-slides/README.md) |
| **GRID** | `Map<itemId,"r,c">` | Placement heatmap (rows × cols), per-item stacked bar as fallback | 🚧 heatmap placeholder; live per-cell shading on the board |
| **PLACE_ON_IMAGE** | `Map<itemId,{x,y}>` | Scatter/heatmap overlaid on the image with the target circles drawn | ✅ Heatmap built, wired into the editor; live density scatter + revealed targets on the board — see [place-on-image](place-on-image/README.md) |
| **AXIS** | `Map<itemId,{x,y}>` | Scatter with per-item colour (needs raw placements — F2), bucketed heat as fallback | ✅ Heatmap built, wired into the editor; live 20 × 20 bucket heat on the board — see [axis](axis-slides/README.md) |
| **MATCHING** | `Map<leftId,rightId>` | Confusion-matrix heatmap, or a Sankey weighted by pair counts | 🚧 heatmap placeholder (Sankey deferred); live per-pair counts on the board |
| **ALLOCATION** | `Map<optionId,Integer>` | Average points per option, grouped or 100 %-stacked | ♻️ reuses `BarChart`; live per-option bars + revealed key pills on the board — see [allocation-slides](allocation-slides/README.md) |
| **FOLLOW_UP** | `String` | Frequency / word cloud (mode-dependent) | 🧩 word cloud built, not wired — no backend tally |
| **DRAWING** | `AppImage` (PNG in S3) | Image gallery, not a quantitative chart | ✅ gallery built (bypasses this pipeline) |
| **Q_AND_A** | `String` question | List/word-cloud toggle on the live board | ✅ live board built (bypasses this pipeline) |
| **TITLE** / **CONTENT** / **MEDIA** / **INSTRUCTION** | — | none — display-only | n/a |

All 17 `SlideType` members are covered.

One authoring gap worth naming: Q&A's `moderated` flag is stored but has **no
runtime effect** on what is shown live, and upvoting is unimplemented.

## Missing renderers — priority

Ordered by breadth of slide types unlocked against reuse of what exists.

1. **Heatmap** is built (`Charts/Heatmap/Heatmap.tsx`) and wired for AXIS and PLACE_ON_IMAGE. GRID and MATCHING remain unwired — their `resultsRegistry` entries are still `implemented: false` — and today's `Heatmap` takes the placement editors' own options (`PlacementResultsDisplayOptions`), not a bare `ChartProps`/`ChartDatum[]` shape, so extending it to GRID/MATCHING means generalizing that contract first, not just flipping a flag. Still the highest-leverage next build.
2. **Stacked / grouped bar** → RANKING, ALLOCATION distribution views. May extend `BarChart` rather than adding a component.
3. **Diverging stacked bar (Likert)** → SCALES, now as a *bucketed* variant since values no longer snap to discrete steps. Also the base for the position-distribution views above.

Cheapest wins first: average-value bars for RANKING and ALLOCATION can ride the
existing `BarChart` today with just an adapter plus backend aggregation.
FOLLOW_UP needs backend aggregation of raw text plus a registry adapter to use
the already-built `WordCloud`.
