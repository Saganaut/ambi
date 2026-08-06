# PRD 2 — Insights Dashboard

**Status: proposed. Depends on [PRD 0](00-data-foundations.md).**

The in-app read surface over session and deck rollups: what the room said, how
engaged it was, and — with one segmentation filter — how the answer differs
between groups. This is the free tier's entire value and therefore the upgrade
prompt for [PRD 1](01-export.md).

## Problem

When a host ends a session today, the data disappears. The reveal charts live
only inside the running presentation; `round_results` is never read back into any
view; nothing aggregates across runs of a deck. A presenter who wants to show
their team what the room said the next morning has nothing to open.

## Goals

- A post-session screen that appears the moment a host ends a presentation.
- A deck-level Results tab pooling every run, with a session picker.
- One segmentation filter that re-cuts every chart by a chosen slide's answer.
- Reuse the existing chart pipeline rather than growing a second one.
- Fast reads: no aggregation over raw facts on page load.

## Non-goals

- Multi-variable filtering, saved views, or a query builder — [PRD 3](03-research-platform.md).
- A live in-session analytics view. The board already renders live tallies over
  Redis; duplicating that here creates two numbers that can disagree.
- Chart-type switching per user. The chart for a slide type is whatever the
  `resultsRegistry` says, and authors already choose it in the editor.

## Surfaces

### Post-session screen

Reached automatically when the host ends a session, and from session history
afterwards. Scoped to one run.

1. **Header** — deck title, when it ran, duration, participants (joined, peak
   concurrent, completed), overall response rate.
2. **Engagement strip** — a participation-over-slides line showing the drop-off
   curve, and median response latency. This is the presenter's real question,
   *was this any good*, and it should be above the per-slide detail.
3. **Slide cards** — one per interactive slide, in deck order: the question, its
   chart, response count and rate, correct rate where scorable, median latency,
   and the top distractor where wrong answers exist.
4. **Leaderboard**, when the deck scored anything.
5. **Export affordance** — free tier sees it disabled with the tier reason.

### Deck Results tab

A `Results` tab alongside the existing deck surfaces, pooled across every run of
the deck.

1. **Header** — times played, unique respondents, completion rate, average
   score, first and last played.
2. **Session picker** — multi-select over the deck's runs, defaulting to all.
   This is how wave comparison is served in v1: narrow to January, read the
   numbers, narrow to June, read them again. Runs are grouped by
   `deckVersion`, and pooling across versions carries a visible notice —
   the deck changed between these runs, so the comparison may not be
   like-for-like.
3. **Slide cards** — same component as the post-session screen, fed pooled data,
   plus `timesPlayed` and observed difficulty.
4. **Hardest / most-skipped / slowest slides** — the ranked lists
   `DeckAnalytics` already declares fields for.

Both surfaces render the same `SlideCard`; only the scope of the data differs.

## Segmentation

One dropdown: **"Break down by …"**, listing eligible slides. A slide is eligible
when its facts are `CATEGORICAL` and its distinct-value count is at or below a
ceiling (default 8) — so an MCQ role question qualifies, a free-text slide does
not.

Selecting one re-cuts every chart on the page into series per segment, and shows
`n` per segment beside the legend. Rules that keep it honest:

- Respondents with no answer on the segmentation slide form an explicit
  **"No answer"** segment rather than vanishing, so segment sizes always sum to
  the total.
- Segmentation across a **pooled, multi-session** view requires the segmentation
  slide to exist in every selected run's `deckVersion`. Where it does not, those
  runs are excluded from the segmented view and the exclusion is stated on
  screen — not silently dropped from the denominator.
- With anonymity mode on, `KAnonymitySuppression` applies at render time: any
  segment cell below `k` renders as a suppressed marker with a tooltip naming
  the rule. The chart must not draw a zero — an empty bar reads as "nobody chose
  this", which is a different and false claim.
- Segmentation is a **paid** capability. Free tier sees the dropdown, disabled,
  with the upgrade reason — the feature is the clearest demonstration of what
  paying buys.

## Read API

Dedicated endpoints over the materialised rollups, separate from the export path
per the settled ruling. Rollups are written on session end, so these are point
reads or small aggregations, not scans.

| Method | Route | Returns |
| --- | --- | --- |
| `GET` | `/api/liveSessions/{publicId}/analytics` | Session rollup: header, engagement, slide summaries |
| `GET` | `/api/decks/{deckId}/analytics` | Deck rollup, optional `sessionIds` filter |
| `GET` | `/api/decks/{deckId}/analytics/sessions` | The session picker's list |
| `GET` | `…/analytics?segmentBy={slideId}` | Any of the above, re-cut into segments |
| `GET` | `/api/decks/{deckId}/analytics/segmentable` | Eligible segmentation slides |

Segmented reads are the one case that may need to touch `response_facts` rather
than the rollup, since pre-materialising every possible segmentation is
combinatorial. Bound it: a segmented read aggregates facts for **one** deck and
at most the selected sessions, with the `(deckId, slideId)` index, and is
entitlement-gated so free-tier traffic never reaches it.

## Frontend

The chart layer largely exists. `ChartDatum` is already the normalized shape,
`registry.ts` already maps slide type → supported charts + adapter, and the
family covers bar, pie, line, Pareto, dot plot, histogram, and word cloud.

The dependency is honest and worth stating plainly: today **only MCQ is wired
end to end**, and each additional type needs the five-step wiring described in
[results-visualization](../results-visualization.md#the-pipeline) — backend
aggregation, adapter, registry entry, picker metadata, dispatcher case. Step one
of those five is exactly what [PRD 0](00-data-foundations.md) delivers, and the
remaining four are needed for the in-session reveal charts regardless of whether
this dashboard ships. **That work is shared cost, not dashboard cost**, but it
is on this PRD's critical path and should be scheduled as such.

`HEATMAP`, `DIVERGING_BAR` and `IMAGE_OVERLAY` are still `PlaceholderChart`
stubs. Grid, axis, and place-on-image cards will render as placeholders until
those are built; the dashboard should degrade to a summary table rather than
showing a "coming soon" tile in a results view a user is about to show their
boss.

## Acceptance criteria

1. Ending a session lands the host on a populated post-session screen with no
   manual refresh and no spinner beyond a normal page load.
2. Every interactive slide type renders either its registered chart or a
   readable summary table — never a placeholder tile.
3. Response rates use the roster as denominator, and a slide answered by 12 of
   30 participants reads 40%, not 100%.
4. Selecting a segmentation slide re-cuts every chart, segment sizes sum to the
   participant total including "No answer", and no cell below `k` renders a
   value in anonymity mode.
5. A deck with 50 runs loads its Results tab from rollups without a raw-fact
   scan, verified by query profiling.
6. Free tier sees the summary and a disabled, explained segmentation control.

## Risks

- **The chart-wiring dependency is larger than the dashboard itself.** Twelve
  slide types × five steps is the bulk of the frontend work here, and it is easy
  to under-scope because "the charts already exist".
- **Segmented reads bypassing the rollup** is the one place this design can hit
  the database hard. The entitlement gate is doing real load-shedding work, not
  just monetisation.
- **Two numbers, one truth.** The live board's Redis tally and the dashboard's
  projection can disagree if their per-type mappers diverge — the shared-mapper
  mitigation in [PRD 0](00-data-foundations.md#risks) is what prevents a support
  ticket that says "the results changed after the session ended".
- **Placeholder charts in a customer-facing view** would undercut the enterprise
  quality bar more than a plain table would.

## Alternatives considered

**Dashboard reads the export projection directly.** One query path, guaranteed
agreement between screen and file. Rejected: it couples an interactive UI to a
bulk-export path with opposite performance characteristics, and a slow export
would degrade page loads.

**Post-session screen only, no deck tab.** Cheaper, well-timed. Rejected because
deck pooling is the market-research view, and the session picker inside it is
what serves wave comparison without a comparison UI.

**Full explorable analytics in v1.** The real research product. Rejected as the
most likely single cause of the schedule slipping; deferred wholesale to
[PRD 3](03-research-platform.md).

## Open questions

1. Should the post-session screen be shareable as a read-only link — to the
   room, or to a client — and if so, does that link honour anonymity and `k`
   suppression independently of the viewer's tier?
2. Does the deck Results tab belong to the deck *owner* only, or to any host who
   ran it? Ownership says the org owns the data; the navigation implication is
   unresolved.
3. Is "No answer" a segment, or a filter toggle? As a segment it keeps
   arithmetic honest; as a series it clutters every chart.
