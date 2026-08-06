# Session Analytics & Data

Ambi collects a rich, typed record of everything an audience does during a live
session and currently throws most of its analytical value away. This folder
holds the specification for turning that record into something a market
researcher, a presenter, or a teacher can actually analyse.

**Status: proposed.** Nothing here is built. These are PRDs awaiting approval,
not descriptions of the system.

## Why now

Three things are true of the codebase today:

1. **The durable record is lossy.** `ParticipantOutcome.choice` is a single
   rendered string, and `RoundEvaluator.describeChoice()` returns non-null only
   for `MCQ`, `NUMBER` and `TEXT`. Every placement, ranking, allocation and
   matching answer has a rich *live* tally in Redis (`AnswerTallyKeys`) that is
   discarded when the round closes — see
   [results-visualization](../results-visualization.md#two-tallies-and-they-do-not-line-up).
   The raw `answers` documents survive, but nothing reads them analytically.
2. **The rollup layer is dead code.** `DeckAnalytics`, `SlideStats`,
   `ScoreBucket`, `CommonMistake` and `DeckStats` are fully specified Mongo
   records with no repository, no service, and no writer. They promise
   `discriminationIndex` and `observedDifficulty` that nothing computes.
3. **Key facts are never persisted.** `LiveSession` has no `startedAt` /
   `endedAt`, no round carries an `openedAt`, and non-responders leave no trace
   at all — so response rates, session duration, and drop-off are not
   computable from what is stored, no matter how clever the query.

Any version of this feature has to fix those three things first. That is why
the foundations spec exists separately from the product specs.

## Settled decisions

These came out of a scoping interrogation and are treated as fixed inputs by
every spec in this folder. Where a decision has a live risk attached, it is
carried into the relevant PRD's *Risks* section rather than re-argued.

| Decision | Ruling |
| --- | --- |
| Primary persona | **Market researcher.** The strictest superset; the presenter and teacher cases fall out of it |
| Must-have deliverable | **Row-level export.** Dashboards are in v1 too, but the export is what makes the feature worth having |
| Unit of analysis | **Session and deck.** Person-longitudinal deferred |
| Cross-tabs | **Core to v1** — every response fact carries a respondent key |
| Cross-session identity | Pseudonymous key for **registered users only**; guests are one-shot anonymous |
| Identity scope | **Org-scoped** (owner-scoped for personal decks) — but **anonymity mode downgrades it to session scope**, so an anonymous run can never be joined to an identified one |
| Deck version | Persisted, as the **content hash of the frozen deck snapshot**. No authoring workflow; runs pool only when the content genuinely matches |
| Anonymity | Enforced at the read boundary, with **k-anonymity cell suppression** (default k = 5) applied *only* in anonymity mode; footnoted in exports |
| Erasure | **In v1, via crypto-shredding** — destroy the per-person salt and identity fields, orphan the rows, no rollup recompute |
| Compliance scope | Retention window + purge, consent notice at join, participant self-export, erasure |
| Free text | **Raw by default**, behind a pluggable transform chain so redaction (LLM-based PII removal, profanity, custom rules) is a plugin, not a hardcoded step |
| Export shape | **Both** — tidy/long and wide, as two renderers over one projection |
| Non-response | **Explicit rows with a null response**, so denominators are honest |
| Engagement telemetry | **Yes** — participant timeline plus derived metrics |
| Psychometrics | Difficulty and distractor analysis **in**; discrimination index **cut** |
| AI analysis | **A plugin on the transform seam**, not a v1 headline |
| Cross-run comparison | **Pooling plus a session filter**; no dedicated comparison UI in v1 |
| Compute timing | **Project on round close, roll up on session end** |
| Dashboard scope | **Static summary plus one segmentation filter**, on the deck Results tab *and* a post-session screen |
| Read path | **Dedicated endpoints over rollups**, separate from the export path |
| Tiering | Free: summary dashboard, 30-day retention. Paid: raw export, segmentation, deck pooling, 12-month retention |
| Ownership | Org owns org-scoped decks' data; deck owner and session host can both export |
| Storage | **Mongo plus materialised rollups.** No warehouse in v1 |
| Delivery | **Async export job** with notification; no webhook or public API in v1 |

## The specs

Read them in order — each depends on the one before it.

- [PRD 0 — Data Foundations](00-data-foundations.md) — the `ResponseFact`
  projection, the per-type normalization rules, the pseudonymous respondent key
  and its shredding path, the missing timestamps, retention, and the transform
  seam. **Prerequisite for everything else; ships no user-visible feature.**
- [PRD 1 — Export](01-export.md) — export profiles (long, wide, aggregates,
  timeline, codebook), formats, the async job model, scoping and filtering,
  entitlement gating, and the column contract.
- [PRD 2 — Insights Dashboard](02-dashboard.md) — the post-session screen and
  the deck Results tab, the single segmentation filter, and the read API over
  the rollups. Reuses the existing `ChartDatum` registry.
- [PRD 3 — Research Platform](03-research-platform.md) — what deliberately
  waits: multi-variable cross-tabs, cohorts and significance testing, the
  enrichment plugins (including AI open-end coding), webhooks and a public API,
  and longitudinal per-person analytics.

## Alternatives considered

The original intent was three competing proposals — export-first, dashboard-first,
and research-platform-first. The scoping decisions collapsed that fork: choosing
the researcher persona *and* cross-tabs as core forces respondent-level rows,
which is the expensive part of all three. Once that is built, the export and the
dashboard are both thin renderers over it, and shipping only one of them would
save little. So the split here is **sequential, not competitive**.

Two genuine alternatives remain open and are argued in place:

- **Scope of the projection** — whether to write a dedicated `ResponseFact`
  collection or query the raw `answers` documents on demand. Argued in
  [PRD 0](00-data-foundations.md#alternatives-considered).
- **Where the wide-shape pivot happens** — server-side renderer versus a
  client-side transform of the long export. Argued in
  [PRD 1](01-export.md#alternatives-considered).

## The one rule that must not be broken

Org-scoped respondent keys make an organization able to correlate one person's
answers across every deck it runs. That is a deliberate requirement, and it puts
the entire weight of the anonymity promise on a single rule: **anonymity mode
derives a session-scoped key**. If that rule is ever bypassed, every anonymous
run the org has held becomes joinable to an identified one, and the promise made
on the join screen is retroactively void.

The scope therefore lives in the key derivation and nowhere else — no reader can
select it, and no query-time convention is relied on. Changes to that code path
are security-relevant and should be reviewed as such. See
[PRD 0](00-data-foundations.md#respondent-key-and-crypto-shredding).

## Sequencing

| Phase | Contents | Gate |
| --- | --- | --- |
| 0 | Schema additions, `ResponseFact` projection, respondent key, timeline, retention job | Facts written for every slide type; backfill run against existing sessions |
| 1 | Session and deck rollups, dashboard read endpoints, post-session screen, deck Results tab | Free-tier value visible without any export |
| 2 | Export jobs, long/wide/aggregate/codebook renderers, entitlement gate | Paid-tier value; the researcher can leave with their data |
| 3 | Segmentation filter, k-anonymity suppression, consent and self-service privacy surfaces | Cross-tabs, honestly enforced |
| 4+ | Everything in [PRD 3](03-research-platform.md) | — |

Phases 1 and 2 are independently shippable once 0 lands; the order above
reflects that the dashboard is what makes a free user recommend Ambi, while the
export is what makes a paid user stay.
