# PRD 1 — Export

**Status: proposed. Depends on [PRD 0](00-data-foundations.md).**

Let a session's or a deck's data leave Ambi in a form a researcher can load into
Excel, SPSS, R, or Python without cleaning it first. This is the deliverable that
makes the feature worth having: if the dashboard cannot answer a question, the
export must not be the reason the user is stuck.

## Problem

There is no export of any kind today. A host who runs a workshop, collects 400
responses across 15 slides, and wants to send findings to a client has exactly
one option: screenshot the board. For the market-research persona that is
disqualifying — the deliverable *is* the data file.

## Goals

- Row-level export at respondent grain, in both the shape statisticians expect
  and the shape spreadsheet users expect.
- Self-describing output: a consumer who opens the file six months later can
  tell what every column means without asking.
- Scoped to a session, a deck, or a chosen set of sessions.
- Honest about non-response, and honest about suppression when anonymity is on.
- Never blocks a request thread or times out on a large session.

## Non-goals

- Scheduled or recurring exports. Manual request only in v1.
- Push delivery — no webhook, no email attachment, no Drive/Sheets connector.
  Those are [PRD 3](03-research-platform.md).
- Charts or formatting in the output. The export is data; presentation is the
  dashboard's job.

## Export profiles

Five profiles, all rendered from the same `ResponseFact` stream. A request
selects one or more; multi-select produces one archive containing each.

| Profile | Grain | Serves |
| --- | --- | --- |
| `RESPONSES_LONG` | one row per respondent × slide × element | Pivot tables, R, pandas, any tool that reshapes. The canonical export |
| `RESPONSES_WIDE` | one row per respondent, one column per slide (or per slide × element) | SPSS, survey tools, and anyone who expects "one row is one person" |
| `AGGREGATES` | one row per slide × option | Charting and quick reporting without touching respondent rows. **The only profile available on the free tier** |
| `TIMELINE` | one row per participant timeline event | Drop-off, attendance, reconnect churn |
| `CODEBOOK` | one row per slide and per value label | The data dictionary: slide id, ordinal, type, question text, value kind, label set, scoring config |

`CODEBOOK` is not optional garnish. Without it, a wide file's `s07_confidence`
column is unreadable to anyone who was not in the room, and a long file's
`element_id` values are opaque UUIDs. It is always included in an archive.

### Long shape — column contract

```text
session_id, session_started_at, deck_id, deck_version, deck_title,
respondent_key, respondent_key_scope, participant_label,
slide_id, slide_ordinal, slide_type, slide_title,
element_id, element_label,
value_kind, value_category, value_number, value_text, value_x, value_y,
derived_distance, media_ref,
correct, points_awarded, response_time_ms, responded_at, response_status
```

`participant_label` is the display name, and is **omitted entirely** — not
blanked — when anonymity mode is on, so that a consumer cannot mistake an empty
column for missing data.

`respondent_key_scope` is exported because it tells the consumer what the key
can legitimately be joined on. A `SESSION`-scoped key (any anonymous run, and
every guest) is meaningless outside its own session; joining two sessions' facts
on it would silently fabricate respondents. Emitting the scope makes that
misuse detectable rather than invisible, and the codebook states the rule.

### Wide shape — pivot rules

One row per `(session_id, respondent_key)`. Column naming is
`s{ordinal:02d}_{slug}` for single-value slides and
`s{ordinal:02d}_{slug}__{element_slug}` for multi-element ones, where the slug is
derived from the authored title, lowercased, non-alphanumerics collapsed to `_`,
truncated to 24 characters, and de-duplicated with a numeric suffix. Coordinates
emit `__x` / `__y` pairs.

Two rules keep the shape usable:

- **A column cardinality ceiling.** A 20-item ranking slide would emit 20
  columns; a matching grid can emit more. Past a configurable ceiling (default
  50 columns per slide) the slide is emitted as a single JSON-encoded cell and
  flagged in the codebook, rather than producing a file Excel refuses to open.
- **Multi-select MCQ becomes indicator columns** (`__opt_{label}` = 0/1) rather
  than a delimited string, because a delimited string is unanalysable without
  splitting it back out. Note `McqAnswer` holds a `Set<String>` of option ids
  today; if that model changes to consecutive individual submissions, the
  indicator encoding still holds.

## Formats

| Format | Notes |
| --- | --- |
| CSV (in a `.zip`) | One `.csv` per profile plus a `README.txt`. UTF-8 with BOM so Excel does not mangle non-ASCII names |
| XLSX | One sheet per profile. Convenient, and the format most non-technical users actually want |
| JSON | Line-delimited per profile, for pipelines |

## Job model

Exports run asynchronously, as decided. A synchronous path is deliberately
excluded from v1 even for small sessions — one code path, one set of failure
modes, one place to enforce entitlements — at the cost of a job round-trip on a
25-person session that would have streamed instantly. See
[Alternatives](#alternatives-considered).

```java
@Document(collection = "export_jobs")
public record ExportJob(
        @Id String id,
        String requestedByUserId,
        ExportScope scope,              // SESSION | DECK | SESSION_SET
        String deckId,
        List<String> sessionIds,
        Set<ExportProfile> profiles,
        ExportFormat format,
        ExportFilters filters,
        ExportStatus status,            // QUEUED | RUNNING | READY | FAILED | EXPIRED
        String artifactKey,             // S3 (Garage) object key
        Instant requestedAt, Instant completedAt, Instant expiresAt,
        String failureCode,
        long rowCount,
        int suppressedCellCount) {
}
```

Endpoints, following the existing `/api/liveSessions` camelCase route
convention:

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/exports` | Request an export; returns `202` and the job |
| `GET` | `/api/exports/{id}` | Poll status |
| `GET` | `/api/exports/{id}/download` | Redirect to a short-lived presigned URL |
| `GET` | `/api/exports?deckId=` | List a user's recent jobs |
| `DELETE` | `/api/exports/{id}` | Cancel or discard |

Artifacts land in the deck's existing S3 namespace with a 7-day `expiresAt`,
after which the object and the job row are purged. Presigned URLs are minted per
download request, never stored — the existing image platform already learned
that a stored presigned URL expires and returns a confusing `400`.

New error codes must be registered in the error-codes registry in the same
commit: `EXPORT_NOT_ENTITLED`, `EXPORT_SCOPE_INVALID`, `EXPORT_EMPTY`,
`EXPORT_EXPIRED`, `EXPORT_TOO_LARGE`.

## Filtering and scope

- **Session** — one run.
- **Deck** — all runs, pooled. Rows carry `session_id` so the consumer can
  re-split.
- **Session set** — an explicit list. This is how "wave 1 versus wave 2"
  comparison is served in v1 without building a comparison UI: the user picks
  the January sessions, exports, and compares in their own tool.

Additional filters: date range, completed-sessions-only, minimum participant
count, and exclusion of the host's own participant record (on by default — the
host is not a respondent and quietly inflates every count).

## Privacy enforcement

Every export runs the [transform chain](00-data-foundations.md#transform-seam):

- `RetentionFilter` always.
- `IdentityStrip` when the deck or session had `anonymousMode` on. Anonymity is
  a property of the **run**, not of the export request — a host cannot promise
  anonymity in the room and then export names.
- `KAnonymitySuppression` on the `AGGREGATES` profile when anonymity is on.
  Suppressed cells render as `NA` with the archive's `README.txt` naming the
  rule and the `k` in force, and `suppressedCellCount` recorded on the job so the
  UI can warn before the user builds an analysis on holes.

`RESPONSES_LONG` and `RESPONSES_WIDE` are **not** cell-suppressed — suppression
is a property of published aggregates, and row-level data is either releasable
to this requester or it is not. What protects the respondent there is the
identity strip plus the entitlement check.

Free-text values export raw, per the settled decision, with an acknowledgement
prompt on the request form naming the risk. The transform seam is where an
opt-in redaction plugin will later slot in.

## Entitlements

Resolved against `Membership` / `MembershipTier`:

| Tier | Profiles | Scope | Retention |
| --- | --- | --- | --- |
| `FREE` | `AGGREGATES`, `CODEBOOK` | single session | 30 days |
| `INDIVIDUAL` | all | session, deck, session set | 12 months |
| `ORG_*` | all | all, org-wide | 12 months |

Gate at request time with `EXPORT_NOT_ENTITLED` rather than silently degrading
the output — a researcher who receives a quietly thinner file will trust the
data less, not upgrade faster.

## Ownership and authorization

Per the settled ruling: an org-scoped deck's data belongs to the org; otherwise
to the deck owner. **Both the deck owner and the session host may export**, and
an org admin may export anything org-scoped. This composes with the existing
deck ACL model rather than introducing a parallel one; the export check is
`canExport(principal, deck, session)` layered on the existing visibility and
grant resolution.

## Acceptance criteria

1. A session with every interactive slide type exports in all five profiles, and
   the long profile's row count equals `roster × slides × elements` with no gaps.
2. Long and wide profiles of the same session reconcile: every wide cell is
   reconstructible from the long rows.
3. An anonymity-mode session's export contains no display-name column at all,
   and its aggregate profile suppresses every cell below `k`.
4. A 500-participant × 40-slide session exports without timing out and without
   loading the full fact set into memory (streamed rendering, verified by a
   bounded-heap test).
5. A free-tier user requesting `RESPONSES_LONG` receives `EXPORT_NOT_ENTITLED`,
   and the code is present in the error-codes registry in the same commit.
6. The codebook alone is sufficient to interpret every column in the other
   profiles — checked by review, not by a test.

## Risks

- **Column contract stability.** Once someone builds a script against these
  headers, changing them breaks it silently. Mitigation: version the contract in
  the archive `README.txt` and treat header changes as breaking.
- **Wide-shape explosion.** The ceiling handles the pathological case but makes
  the output inconsistent between decks. Documented in the codebook, still
  surprising.
- **Raw verbatims leaving the building.** The acknowledgement prompt is a
  speed bump, not a control. This is an accepted risk of the settled decision,
  and the argument for prioritising the redaction plugin.
- **Async-only friction** on small exports, discussed below.

## Alternatives considered

**Synchronous download under a size threshold.** Two code paths, but a 25-person
class export becomes instant instead of a job round-trip. Rejected for v1 to keep
one enforcement point for entitlements, retention, and suppression — the places
where a second path would most likely diverge. Worth revisiting once the job
pipeline is proven, since the UX cost is real and falls hardest on the teacher
persona.

**Wide-shape pivot on the client.** Ship only the long file and pivot in the
browser. Cheaper server-side, and immediately wrong for the 500-participant case
the async job exists to serve. Rejected.

**Export from `answers` directly, skipping the projection.** Would have let this
PRD ship without [PRD 0](00-data-foundations.md). Rejected: non-response rows are
unrepresentable, and 13 payload interpreters would live in the renderer.

## Open questions

1. Does the free tier get `AGGREGATES` at all, or is *any* file download paid?
   The table above assumes aggregates are free because they are the shareable
   artifact that markets the product.
2. A session-set export spanning multiple `deck_version` values: warn and
   proceed, or refuse? Now that the version is a persisted content hash the
   mismatch is *detectable*, which makes proceeding silently indefensible —
   the open question is only whether the warning is blocking.
3. Is a 7-day artifact expiry right, or should completed exports persist for the
   retention window like the underlying data?
