# Results Visualization

How live-session slide **results** are charted, which visualization suits each
slide type, and what's still missing. This is a design/reference doc for
planning future viz work. A per-type **map** (`resultsRegistry`) now records the
valid charts for every question type, and the chart family covers them — but
only **MCQ** is wired end-to-end into the editor UI. `Histogram` and
`WordCloud` are built; the heatmap, Likert and image-overlay renderers are
scaffolded placeholders awaiting real implementations. (`WordCloud`'s only
current consumer is the live Q&A board, a separate pipeline from the one
described below — see the [Q&A per-type note](#per-type-notes).)

---

## Overview — how a result becomes a chart

Every chart renderer consumes a single normalized shape, `ChartDatum[]`, defined
in [`Chart.types.ts`](../../frontend/src/shared/components/Charts/Chart.types.ts):

```ts
interface ChartDatum {
  id: string;
  value: number;            // the tallied count / magnitude for this row
  text?: string;
  color?: string;
  imageUrl?: string;
  highlight?: boolean;      // emphasis (e.g. the correct MCQ option)
  isCorrect?: boolean;
  optionType: "TEXT" | "NUMBER" | "IMAGE";
}
```

The pipeline from raw responses to a rendered chart:

1. **Backend aggregation** — per-participant responses (`Answer.payload`, one
   `*Answer` record per scorable type in
   [`session/answer/payload/`](../../backend/src/main/java/com/cephadex/ambi/session/answer/payload))
   are tallied into
   [`RoundResult`](../../backend/src/main/java/com/cephadex/ambi/session/roundResult/RoundResult.java)
   — notably `optionCounts: Map<String,Integer>`.
2. **Adapter** — a frontend adapter maps domain data + the tally into
   `ChartDatum[]`. Only
   [`adapters/mcq.ts`](../../frontend/src/shared/components/Charts/adapters/mcq.ts)
   exists today (`mcqToChartData`).
3. **Registry (the map)** —
   [`registry.ts`](../../frontend/src/shared/components/Charts/registry.ts)
   declares, per content type, its `supportedViz: ChartType[]` (and, for
   fully-wired types, an adapter + sample-data generator). `resultsRegistry`
   maps every response-producing type; `getSupportedViz(contentType)` is the
   query an editor section calls to build its viz picker. Only `MCQ` is
   `implemented: true` (real adapter); the rest expose their charts but aren't
   yet wired into an editor section.
4. **Picker metadata** —
   [`vizMeta.tsx`](../../frontend/src/shared/components/Charts/vizMeta.tsx)
   supplies the label + icon for each `ChartType` in the authoring pickers.
5. **Dispatcher** —
   [`ResultsDisplaySwitch.tsx`](../../frontend/src/features/deck/components/DeckEditor/SlideContent/ResultsDisplaySwitch/ResultsDisplaySwitch.tsx)
   switches on the chosen `ChartType` and renders the matching component.

**The chart family** — every renderer consumes the same `ChartProps`
(`ChartDatum[]`), so any type slots into the dispatcher and preview pipeline:

| Component | `ChartType`(s) | Shows |
|---|---|---|
| `BarChart` | `BAR_HORIZONTAL`, `BAR_VERTICAL` | proportional bars per option |
| `PieChart` | `PIE`, `DONUT` | share of whole (variant prop) |
| `LineChart` | `LINE` | values as points + polyline |
| `ParetoChart` | `PARETO` | descending bars + cumulative-% line |
| `DotPlot` | `DOT` | lollipop/dot per option |
| `Histogram` | `HISTOGRAM` | gapless bars over binned values (built) |
| `WordCloud` | `WORD_CLOUD` | terms sized by frequency, center-weighted layout (built; fed by [`adapters/words.ts`](../../frontend/src/shared/components/Charts/adapters/words.ts)) |
| `PlaceholderChart` | `HEATMAP`, `DIVERGING_BAR`, `IMAGE_OVERLAY` | "coming soon" stub — each has a thin wrapper (`Heatmap`, `DivergingBar`, `ImageOverlay`) to grow into |
| — | `NONE` | plain non-chart list |

**Key caveat:** only MCQ is aggregated into `RoundResult.optionCounts`
(`AnswerTallyKeys.optionKeys` returns empty for every other type). So charting
any non-MCQ type requires **both** a new frontend adapter/registry entry **and**
backend aggregation of the raw `Answer.payload` records — see the
[wiring checklist](#wiring-checklist). Q&A is the one exception: it's
non-scorable (no `RoundResult` at all), so its live word cloud tokenizes raw
submitted text directly on the frontend rather than going through this
backend-aggregation pipeline — see its [per-type note](#per-type-notes).

---

## Chart-fit matrix

Status legend: ✅ built & mapped · 🧩 renderer built, but not wired into an
editor section (no adapter/backend tally) · 🚧 mapped, renderer is a
placeholder stub · ♻️ mapped, reuses an existing chart (needs adapter + backend
tally) · ❌ not mapped, no component yet. "Mapped" = present in
`resultsRegistry`; no non-MCQ type is wired into an editor section yet.

| Slide type | Response payload | Suitable visualization | Status |
|---|---|---|---|
| **MCQ** | `Set<String>` option ids | Bar / Pie / Donut / Line / Pareto / Dot | ✅ built |
| **NUMBER** | `double` | Histogram (or DotPlot / box) with target marker | ✅ Histogram built (no editor UI yet) |
| **TEXT** | `String` | Word cloud, or ranked term bar | 🧩 word cloud built, not wired (no backend tally) |
| **RANKING** | `List<String>` order | Avg-rank bar, or position-distribution stacked bar / bump | ♻️ reuses BarChart |
| **SCALES** | `Map<id,Integer>` | Likert diverging stacked bar, or mean±spread per item | 🚧 diverging-bar placeholder |
| **GRID** | `Map<itemId,"r,c">` | Placement heatmap, or per-item stacked bar | 🚧 heatmap placeholder |
| **PLACE_ON_IMAGE** | `double x,y` | Scatter / heatmap overlay on the image | 🚧 image-overlay placeholder |
| **AXIS** | `Map<itemId,{x,y}>` | Scatter with per-item color (needs raw placements — follow-up F2), or bucketed heatmap | 🚧 heatmap placeholder; live 10×10 bucket heat built on the board — see [axis slides](axis-slides/README.md) |
| **MATCHING** | `Map<leftId,rightId>` | Confusion-matrix heatmap, or Sankey | 🚧 heatmap placeholder (Sankey deferred) |
| **ALLOCATION** | `Map<optionId,Integer>` | Avg-points grouped / 100%-stacked bar | ♻️ reuses BarChart |
| **FOLLOW_UP** | `String` | Frequency / word cloud (mode-dependent) | 🧩 word cloud built, not wired (no backend tally) |
| **DRAWING** | `String` imageData | Image gallery (not a quantitative chart) | ❌ gallery deferred |
| **Q_AND_A** | `String` question | List/word-cloud toggle on the live board (not a post-round chart) | ✅ live board built (bypasses this pipeline — see note) |
| **TITLE** | — | None — display-only, no responses | n/a |
| **CONTENT** (RichText) | — | None — display-only | n/a |
| **MEDIA** | — | None — display-only | n/a |
| **INSTRUCTION** | — | None — join-info slide | n/a |

All 17 `SlideType` members are covered above.

---

## Per-type notes

Only scorable types (plus Q&A, which collects text) produce responses to chart.

- **MCQ** — the only auto-tallied type; counts per option id map straight to
  `ChartDatum.value`. Author already picks the chart via `McqDataVisualization`
  (the full 8-type set). Reference implementation for every other type.
- **NUMBER** — one continuous value per participant, so the natural view is a
  **distribution**, not categories: a histogram (bin the guesses) or dot plot,
  with the correct `answer` and its `tolerance` band marked. Bar/pie don't fit
  continuous data.
- **TEXT** — free text per participant. In `WORDCLOUD` match mode (empty
  `acceptedAnswers`, unscored) the intent is explicitly a **word cloud** sized
  by term frequency; a ranked bar of top terms is the tabular fallback.
- **RANKING** — each participant submits a full ordering. Chart the **average
  (or median) rank position per item** (a bar could reuse `BarChart`), or the
  distribution of positions per item as a stacked bar (needs a stacked variant).
- **SCALES** — a value per statement per participant. The canonical view is a
  **Likert diverging stacked bar** (one row per statement, agree/disagree fanned
  from center), or mean ± spread per item with the `correctValues` target marked.
- **GRID** — each participant places items into matrix cells. A **heatmap**
  (rows × cols, shaded by placement count) reads best; a per-item stacked bar is
  the fallback.
- **PLACE_ON_IMAGE** — normalized `x,y` pins. Overlay a **scatter/heatmap on the
  image** with the `correctTargets` circles drawn. Needs an image-aware renderer.
- **AXIS** *(spec only)* — normalized `x,y` per item on a labeled plane. A
  **scatter with per-item color** (targets + tolerance circles drawn once
  revealed) reads best; the 10×10 bucketed heat the live board shows is the
  fallback. Raw placements aren't client-readable yet (follow-up F2 in the
  [axis spec](axis-slides/README.md)).
- **MATCHING** — chosen left→right pairs. A **confusion-matrix heatmap**
  (left items × right items) or a **Sankey** weighted by pair counts shows where
  the crowd matched correctly vs. confused pairs.
- **ALLOCATION** — points distributed across options. Chart **average points per
  option** (grouped or 100%-stacked bar) vs. `correctAllocations`. A simple mean
  bar can reuse `BarChart`.
- **FOLLOW_UP** — a free-text response derived from the parent round; shape is
  mode-dependent but generally frequency / word-cloud style.
- **DRAWING** — serialized image per participant; not a quantitative chart —
  present as an **image gallery** (any real "chart" comes from downstream voting).
- **Q&A** — free-text audience questions, never scored. The **live board**
  (`QAndABoardContent`) is built end-to-end: participants send questions
  (capped per player by `QAndAContent.maxResponses`), the host answers inline
  (`QAndAHostAnswerStore`, Redis-only — never flushed to Mongo), and a
  per-device **List/Word-cloud toggle** visualizes the live submissions. The
  cloud reuses the shared `WordCloud` renderer, but feeds it from a
  client-side tokenizer (`adapters/words.ts`, `wordFrequencies`) over the raw
  question text carried by the `QAndAUpdated` event/snapshot — it does **not**
  go through `RoundResult`, the registry, or `ResultsDisplaySwitch`, since Q&A
  has no backend tally to aggregate. The post-round/editor results view (the
  pipeline this doc otherwise describes) is still unmapped for Q&A. The
  authoring `moderated` flag and upvoting are **not** implemented at runtime —
  `moderated` is stored but has no effect on what's shown live.

---

## Missing visualizations — recommended priority

Ordered by breadth of slide types unlocked and reuse of existing infrastructure.

1. **Word cloud** → the `WordCloud` renderer + tokenizer adapter are now built
   and live for Q&A's board (a frontend-only pipeline — see its per-type
   note). TEXT (`WORDCLOUD` match mode) and FOLLOW_UP still need backend
   aggregation of raw text plus a `resultsRegistry` adapter to wire into the
   post-round results pipeline above.
2. **Histogram / box plot** → NUMBER. The only viz for continuous responses.
3. **Diverging stacked bar (Likert)** → SCALES. Also the base for RANKING /
   ALLOCATION position-distribution views.
4. **Heatmap** → GRID, MATCHING (confusion matrix), PLACE_ON_IMAGE. One heatmap
   primitive covers three slide types.
5. **Stacked / grouped bar** → RANKING, ALLOCATION. May extend the existing
   `BarChart` rather than adding a new component.
6. **Image-overlay results** → PLACE_ON_IMAGE (scatter/heatmap on image),
   DRAWING (gallery). Image-aware, lower reuse.

Note: **average-value bars** for RANKING and ALLOCATION can likely reuse
`BarChart` today with just an adapter + backend tally — the cheapest wins.

---

## Wiring checklist

To chart a new slide type end-to-end:

1. **Backend** — aggregate the type's `Answer.payload` into `RoundResult` (today
   `AnswerTallyKeys.optionKeys` only yields keys for MCQ; extend it or add a
   type-specific projection so the tally isn't empty).
2. **Adapter** — add `adapters/<type>.ts` producing `ChartDatum[]` (model
   `adapters/mcq.ts`): a `…ToChartData` mapper + a sample-distribution generator
   for authoring previews.
3. **Registry** — add a `resultsRegistry` entry in `registry.ts` with the type's
   `supportedViz: ChartType[]`, adapter, and sample generator.
4. **Metadata** — if introducing a new `ChartType`, add its label + icon to
   `vizMeta.tsx` (icons live in `frontend/src/shared/assets/icons/charts/`).
5. **Dispatcher** — add a case in `ResultsDisplaySwitch.tsx` (the `never`
   exhaustiveness check will flag a missing branch).

Reuse first: RANKING and ALLOCATION mean-value views can ride on the existing
`BarChart`. `Histogram` and `WordCloud` are already built; only the remaining
new shapes (heatmap, diverging bar, image overlay) need a new component under
`Charts/`.

---

## Related

- [Deck Editor](deck-editor/README.md) — authoring dashboard the pickers live in.
- [Follow-Up Slides](follow-up-slides/README.md) — how FOLLOW_UP consumes parent
  submissions.
- [Missing Features](missing-features.md) — cross-cutting backlog.
- [Glossary](../glossary.md) — deck / slide / element domain terms.
