# PRD 3 — Research Platform

**Status: deferred. Depends on [PRD 0](00-data-foundations.md),
[PRD 1](01-export.md) and [PRD 2](02-dashboard.md).**

What was deliberately cut from v1, why, and what the foundations already make
cheap. This exists so that decisions taken in the first three PRDs can be
checked against where the product is going, and so that nothing here requires
reopening the projection.

## 1. Multi-variable cross-tabs and a query builder

**Deferred because** one segmentation dropdown answers most of the question at a
fraction of the cost, and a query builder is a genuine product surface — filter
composition, operator semantics, saved views, shareable state — not a feature
increment.

**Already enabled:** `ResponseFact` is at respondent grain with a stable key, so
arbitrary filter composition is a query concern, not a schema change.

**Still needed:** a filter DSL over facts, server-side pagination of segmented
aggregates, and a materialisation strategy — pre-computing every combination is
combinatorial, so this likely wants a bounded cache keyed on the filter set.

## 2. Cohorts, waves, and significance testing

**Deferred because** the session picker in [PRD 2](02-dashboard.md) plus a
session-set export in [PRD 1](01-export.md) covers comparison for a user willing
to do the comparing. A built-in significance test is where a data product most
easily becomes actively misleading.

**Still needed, and it is mostly statistical care rather than engineering:**

- Named, saved cohorts rather than ad-hoc session sets.
- A correction for multiple comparisons. A deck with 20 slides segmented 3 ways
  yields 60 tests; at α = 0.05 roughly three come back "significant" from noise
  alone. Shipping uncorrected p-values into a market-research deliverable would
  be a defect, not a simplification.
- An explicit statement of what the sample *is*. Ambi respondents are a
  convenience sample of whoever was in the room; no test makes them
  representative of a population, and the UI must not imply otherwise.

**No longer blocked on versioning.** `deckVersion` is persisted from
[PRD 0](00-data-foundations.md#deck-version) as the content hash of the frozen
snapshot, so "did the instrument change between waves" is answerable from the
data rather than from the author's memory. Comparing waves of an instrument that
silently changed is the classic way to produce a confident wrong answer, and the
hash is what makes that detectable.

## 3. Enrichment plugins

The [transform seam](00-data-foundations.md#transform-seam) exists precisely so
these land without touching the projection. Each is an ordered
`ResponseTransform` selected per read or per export.

| Plugin | What it does | Notes |
| --- | --- | --- |
| PII redaction | LLM or rules pass over `valueText`, redacting emails, phones, and names | The settled free-text decision assumes this arrives; it is the highest-value plugin |
| Open-end coding | Clusters free text into themes with counts, traceable to source rows | The most differentiating capability on this list |
| Sentiment | Per-response polarity, aggregated per slide | Cheap once coding exists |
| Narrative summary | An auto-written "what the room said" per session | Demo gold; needs provenance back to sources or it will not be trusted |
| Profanity / moderation | Filter or flag | Also useful in-session, which is a different code path |
| Translation | Normalize a multilingual room's open ends before coding | Prerequisite for coding to work at all in mixed-language sessions |

Cross-cutting requirements before any LLM plugin ships: per-org cost controls, a
provenance link from every generated claim back to the responses behind it, an
explicit opt-in per deck (a customer's respondent data going to a model provider
is a DPA question), and a deterministic fallback when the model is unavailable.
Ambi already targets the Claude API elsewhere; this should use the latest Claude
models rather than introducing a second provider.

## 4. Programmatic access

**Deferred because** [PRD 1](01-export.md)'s async job covers the "get my data
out" need, and a public contract is expensive to change once someone depends on
it.

**Deliberate hedge:** the export column contract is versioned from day one, so a
future webhook or API payload can be defined *as* that contract rather than
leaking internal models. This is the one deferral that would otherwise cost real
rework.

| Capability | Notes |
| --- | --- |
| Signed webhook on session end | The integration primitive everything else builds on; needs a signing scheme, retries, and a delivery log |
| Read-only analytics API | Token-scoped access to sessions, facts, and rollups. Needs its own rate limiting and an entitlement model distinct from the UI's |
| Sheets / Zapier connectors | Thin clients over the webhook plus the API; likely the highest adoption-per-effort once both exist |

## 5. Longitudinal per-person analytics

The teacher persona's real ask: how did this student progress across the term.

**Partly unblocked.** The respondent key is org-scoped from
[PRD 0](00-data-foundations.md#respondent-key-and-crypto-shredding), so the
linkage this needs already exists in the data — no schema work remains. What is
deferred is the product surface and the consent model around it, not the
plumbing.

**One constraint carries forward:** anonymous runs derive a session-scoped key
and are therefore **permanently excluded** from longitudinal analysis. A teacher
who runs anonymous polls cannot later decide to track individuals through them.
That is correct behaviour, and it needs saying in the UI at the moment the
anonymity toggle is set — not discovered a term later.

**Would additionally need:** roster import or LMS integration (Google Classroom,
Canvas/LTI), a gradebook export shaped to the target LMS, and per-student views
with the consent model that tracking a named minor demands. That last point is
not a footnote: FERPA and equivalent regimes apply the moment this is aimed at
schools, and it is a bigger commitment than everything else on this page
combined.

## 6. Scale-out

Mongo plus materialised rollups is right for v1 and will not survive a customer
running thousands of sessions with dashboard traffic on pooled deck queries.

**Trigger to revisit:** segmented reads (the one path that touches raw facts)
exceeding acceptable latency, or `response_facts` growth outpacing the retention
window's ability to cap it.

**Then:** a columnar target — ClickHouse, DuckDB, or BigQuery — fed by the same
projector as a second sink. Because the projection is already a fact table with
a stable schema and a version field, this is a new sink rather than a redesign,
which is the main reason the projection was preferred over on-demand queries in
the first place.

## 7. Deferred compliance work

- **Erasure of residual response *facts*** — v1 deletes verbatims and orphans
  the key, leaving the record that a respondent participated. Whether that
  residual is acceptable needs counsel.
- **Data residency** — an enterprise buyer will eventually ask where the data
  sits. Nothing in the current architecture supports per-org region pinning.
- **Audit log of exports** — who took what data, when. `ExportJob` records
  enough to build this; nothing surfaces it.
- **DPA and processor documentation** — the ownership ruling makes the customer
  the controller and Ambi the processor, which is the right posture and needs
  the paperwork to match before enterprise procurement.
