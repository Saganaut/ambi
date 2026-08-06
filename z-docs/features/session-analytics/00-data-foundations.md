# PRD 0 — Data Foundations

**Status: proposed. Prerequisite for [PRD 1](01-export.md) and [PRD 2](02-dashboard.md).
Ships no user-visible feature.**

Turn the live session's transient, type-specific runtime state into one durable,
typed, respondent-keyed fact table that every downstream reader — export,
dashboard, rollup — consumes without knowing anything about slide payloads.

## Problem

A live round produces three parallel records today, none of which is a usable
analytical base:

- **`answers`** — the raw truth. One document per submission, with a typed
  `AnswerPayload` (13 shapes). Complete and durable, but every consumer would
  have to re-implement payload interpretation, and there is no row at all for a
  participant who did not answer.
- **Redis `tallyStore`** — rich per-choice counts covering the placement kinds
  (`AnswerTallyKeys.optionKeys` emits for `MCQ`, `GRID`, `AXIS`, `SCALES`,
  `MATCHING`, `RANKING`, `ALLOCATION`, `FOLLOW_UP`, `PLACE_ON_IMAGE`).
  **Discarded when the session ends.**
- **`round_results`** — the durable projection. Carries
  `ParticipantOutcome(participantId, choice, correct, points, responseTimeMs)`
  plus an `optionTally`, but `choice` is a single stringified rendering that
  `RoundEvaluator.describeChoice()` populates only for `MCQ`, `NUMBER` and
  `TEXT`. For the other ten interactive types the durable tally is empty.

So the two tallies do not line up, the durable one is the weaker of the pair,
and the shape that survives — a single string per participant per round — cannot
represent a ranking, an allocation split, or a 2D placement without lying about
it.

Three further gaps make whole classes of question unanswerable regardless of
projection quality:

1. **No non-response rows.** Outcomes exist only for participants who submitted.
   Every rate computed from `round_results` silently uses "people who answered"
   as its denominator.
2. **No timing anchors.** `LiveSession` has no `startedAt` / `endedAt`; no round
   records when it opened. `RoundResult.closedAt` is the only durable timestamp.
   `DeckAnalytics.averageSessionDurationMs` is therefore uncomputable as
   specified.
3. **No cross-session identity.** A `Participant` is minted fresh per (session,
   user) by design, and `userId` is stripped on the wire. Nothing links two runs
   of the same deck attended by the same person.

## Goals

- One durable collection at respondent × slide × element grain, typed rather
  than stringified, covering **every** interactive slide type.
- Explicit representation of non-response, distinguishable from absence.
- A pseudonymous respondent key that supports cross-tabs and repeat-attendee
  linkage, and that can be destroyed on request without touching response rows.
- Durable timing and participation telemetry.
- A read-time transform seam so redaction, suppression, and future enrichment
  are pluggable.
- Materialised session and deck rollups, replacing the dead `DeckAnalytics`
  scaffold with something that is actually written.

## Non-goals

- Any user-visible surface. Exports are [PRD 1](01-export.md), dashboards are
  [PRD 2](02-dashboard.md).
- Replacing the Redis live tally. The live board keeps its low-latency path
  untouched; this projection is written at round close alongside it.
- A separate analytics store. Mongo with materialised rollups is the v1 target.
- Changing `Answer` or `AnswerPayload`. The raw record stays exactly as it is
  and remains the source of truth for backfill and reprojection.

## Model

### `ResponseFact`

New collection `response_facts`, written by an extension of
`RoundResultProjector` at round close. One document per respondent × slide ×
**element**, where an element is the sub-part of a multi-part answer (an option,
a statement, a ranked item, an allocation target, a placed pin). Single-value
types produce exactly one row with a null `elementId`.

```java
@Document(collection = "response_facts")
public record ResponseFact(
        @Id String id,                      // sessionId:slideId:respondentKey:elementId
        int schemaVersion,
        String deckId,
        String deckVersion,                 // content hash of the frozen deck snapshot
        String orgId,                       // null for personally-owned decks
        String sessionId,
        String slideId,
        SlideType slideType,
        int slideOrdinal,                   // position in the deck snapshot
        String slideTitle,                  // denormalized; decks mutate between runs
        String respondentKey,               // pseudonymous, see below
        String participantId,               // per-run id, for joins against the timeline
        String elementId,                   // optionId / statementId / targetId / itemId; null if single-value
        String elementLabel,                // denormalized authored label
        ValueKind valueKind,
        String valueCategory,               // CATEGORICAL
        Double valueNumber,                 // NUMERIC, RANK, allocation points, scale value
        String valueText,                   // TEXT
        Double valueX, Double valueY,       // POINT2D, normalized 0..1
        Double derivedDistance,             // POINT2D: distance to the graded target
        String mediaRef,                    // IMAGE_REF: S3 key
        Boolean correct,                    // null when the type or slide is not gradable
        Integer pointsAwarded,
        Long responseTimeMs,
        Instant respondedAt,
        ResponseStatus responseStatus) {
}
```

```java
public enum ValueKind { CATEGORICAL, NUMERIC, TEXT, POINT2D, RANK, BOOLEAN, IMAGE_REF, NONE }

public enum ResponseStatus { ANSWERED, SKIPPED, JOINED_LATE, DISCONNECTED, LEFT_EARLY, NOT_APPLICABLE }
```

`NOT_APPLICABLE` covers a respondent who was legitimately never asked — a
non-interactive slide, or a follow-up whose parent they missed. It exists so
that "was not asked" never contaminates a skip rate.

**Why denormalize `slideTitle` and `elementLabel`:** a deck is mutable and a
`LiveSession` freezes only its own snapshot. Pooling six runs of a deck whose
option labels were edited between runs would otherwise produce rows that cannot
be labelled after the fact. `deckVersion` tells a reader *that* two runs differ;
the denormalized labels tell it *what each respondent actually saw*. Both are
needed — versioning alone would force a join back to a snapshot that may since
have been deleted.

### Deck version

`deckVersion` is the **content hash of the deck snapshot `LiveSession` already
freezes at creation** — a stable digest over slide ids, ordinals, titles,
content, and the resolved answer/point settings that affect grading. It is not
an authoring concept: there is no publish step, no draft/published distinction,
and nothing new in the editor.

Two consequences worth stating:

- Runs pool safely **iff** their content is genuinely identical, by
  construction rather than by convention. A deck edited between runs produces a
  different hash and any pooled read can say so.
- Cosmetic edits (a theme change, a background swap) must be excluded from the
  digest, or every reskin fragments the pooled data for no analytical reason.
  The digest covers what a respondent was *asked*, not how it looked.

This is the minimum viable version concept for analytics. If deck versioning
later becomes a user-facing feature with its own semantics, `deckVersion` here
should become a reference to it rather than a second competing notion.

### Per-type normalization rules

The single most consequential table in this spec: it defines what a "response"
*is* for each slide type, and therefore what every export column and chart
downstream can say. `RoundEvaluator.describeChoice()` is superseded by a
per-type `ResponseFactMapper`.

| Slide type | Rows per respondent | `elementId` | Value |
| --- | --- | --- | --- |
| `MCQ` | one per selected option | `optionId` | `CATEGORICAL` = option label |
| `TEXT` | one | — | `TEXT` = raw submission |
| `NUMBER` | one | — | `NUMERIC` |
| `SCALES` | one per statement | statement id | `NUMERIC` = marker position |
| `RANKING` | one per ranked item | item id | `RANK` = 1..n |
| `ALLOCATION` | one per target, **including zero-point targets** | target id | `NUMERIC` = points allocated |
| `MATCHING` | one per left-hand item | left item id | `CATEGORICAL` = matched right-hand label |
| `GRID` | one per placed item | item id | `CATEGORICAL` = cell / column id |
| `AXIS` | one per placed item | item id | `POINT2D` normalized, plus `derivedDistance` to the authored target |
| `PLACE_ON_IMAGE` | one per pin | target id, else pin index | `POINT2D` normalized, plus `derivedDistance` |
| `DRAWING` | one | — | `IMAGE_REF` = S3 key of the submitted PNG |
| `Q_AND_A` | one per submitted question | question id | `TEXT`, with upvote count in `valueNumber` |
| `FOLLOW_UP` | one | — | mode-dependent: `CATEGORICAL` for the picked card, carrying the source respondent's key in `elementId` for `SPOT_THE_ANSWER` |
| Non-interactive | one, `ResponseStatus.NOT_APPLICABLE` | — | `NONE` |

Two rulings worth calling out because they will be questioned later:

- **Coordinates are normalized to 0..1**, not stored in authored canvas units.
  Authors resize backing images and axis extents between runs; normalized
  coordinates pool across runs, authored units do not. The export can multiply
  back out if a consumer wants pixels.
- **Allocation emits zero-point rows.** This mirrors what the live tally already
  does (`optionId@points`, zero entries included) and means an option's rows sum
  to the respondent count, which is what makes the denominator honest.

### Non-response materialisation

At round close the projector writes a fact for **every roster member**, not just
every submitter. The roster comes from `ParticipantRepository` (the same read
`RoundResultProjector.persist` already takes as `List<Participant> roster`), so
no new query is needed. Status is derived:

- submitted → `ANSWERED`
- on roster, no submission, joined before the round opened and still present →
  `SKIPPED`
- joined after the round opened → `JOINED_LATE`
- `ConnectionStatus.DISCONNECTED` at round close → `DISCONNECTED`
- `Participant.leftAt` before round close → `LEFT_EARLY`

`Participant.admittedAt` is already durable (`participants.admitted_at`, the
roster's membership marker), so the admission-time discriminator these statuses
need is available today and needs no new field.

`JOINED_LATE`, `DISCONNECTED` and `LEFT_EARLY` all require the round-open
timestamp added below. Without it they collapse into `SKIPPED`, which is the
degraded mode backfilled historic sessions will sit in.

### Respondent key and crypto-shredding

```java
@Document(collection = "respondent_identities")
public record RespondentIdentity(
        @Id String respondentKey,
        KeyScope scope,                 // ORG | OWNER | SESSION
        String scopeId,                 // orgId, deck-owner userId, or sessionId
        String userId,
        byte[] salt,
        Instant createdAt) {
}
```

`respondentKey = HMAC-SHA256(salt, userId + ":" + scope + ":" + scopeId)`, with a
fresh random `salt` per (user, scope, scopeId).

**The scope is org-level**, so a person is linkable across every deck their
organization runs — which is what makes longitudinal analysis and repeat-attendee
dedup possible. Two fallbacks complete the rule:

| Scope | When | Effect |
| --- | --- | --- |
| `ORG` | deck is org-scoped, run is not anonymous | Linkable across every deck in the org |
| `OWNER` | personally-owned deck, run is not anonymous | Linkable across that owner's decks. Without this, an individual presenter gets no linkage at all |
| `SESSION` | **anonymity mode is on**, or the respondent is a guest | Linkable within the run only |

**Anonymity downgrades the scope to `SESSION`.** This is the single most
important rule in this section. `AudienceSettings.anonymousMode` already exists
and today only hides names and avatars in the room; here it also determines key
derivation. Without the downgrade, an org could run an anonymous engagement
survey and a named onboarding quiz, join the two on a shared org-scoped key, and
put a name against every anonymous answer — the promise made in the room broken
by the schema rather than by a bug. With it, within-session cross-tabs still work
(the core use case), and an anonymous run links to nothing outside itself.

The cost is real and accepted: **anonymous runs cannot be analysed
longitudinally.** That is precisely the trade anonymity is supposed to buy.

Because the scope is baked into the key at derivation time, this is enforced at
write, not by a query-time convention that a future reader could forget.

**Guests** get a `SESSION`-scoped random opaque key and no identity document.
They are one-shot respondents by construction.

**Erasure** deletes every `RespondentIdentity` document for the user across all
scopes and clears the identity fields on their `Participant` documents (display
name, `userId`, avatar). The `ResponseFact` rows keep an orphaned
`respondentKey` that no longer resolves to anybody. No fact is deleted, so **no
rollup recompute is required** — the single most important property of this
design. Org scope makes erasure simpler, not harder: one shred severs linkage
everywhere at once.

The one thing shredding cannot reach is PII *inside* free-text content. Erasure
therefore also deletes that respondent's `valueText` facts, and only those facts
trigger a narrow recompute of the affected slides' rollups.

### Timing and telemetry

New durable fields, all additive:

| Where | Field | Why |
| --- | --- | --- |
| `LiveSession` | `startedAt`, `endedAt` | Session duration; `DeckAnalytics.averageSessionDurationMs` currently cannot be computed |
| `RoundResult` | `openedAt` | Response latency baseline and the `JOINED_LATE` / `LEFT_EARLY` derivations |
| new `participant_timeline` | `(sessionId, participantId, kind, at)` | Drop-off curves and reconnect churn |

`ParticipantTimelineKind`: `JOINED`, `LEFT`, `DISCONNECTED`, `RECONNECTED`,
`REMOVED`. Answer events are deliberately *not* duplicated here — they are
already in `ResponseFact.respondedAt`, and writing them twice invites the two
records to disagree.

The timeline is written from the existing session events
(`ParticipantJoined`, `ParticipantLeft`, `ParticipantReconnected`,
`ParticipantRemoved`, `PresenceChanged`) — this is a durable sink on an event
stream that already exists, not new instrumentation.

### Rollups

Two materialised collections, recomputed on session end:

- **`session_analytics`** — per-session: participant counts, completion,
  per-slide distributions, timing, non-response, leaderboard.
- **`deck_analytics`** — the existing record, *finally written*. Changes to the
  declared schema:
  - **Remove `discriminationIndex`.** It presumes a coherent test with a
    meaningful total score. A market-research deck has no correct answers, and a
    mixed presentation deck's total is not a construct. Leaving a field that is
    only valid for one deck shape invites misreading.
  - **Keep and compute `observedDifficulty`, `commonMistakes`,
    `optionDistribution`, `skipRate`.** These are well-defined for any scorable
    slide and are the teacher-facing hook.
  - `optionDistribution` becomes a `List<TallyEntry>`, not a `Map`. Mongo
    forbids dots in field names and choice strings routinely contain them — the
    same trap `RoundResult.optionTally` already documents.

Rollup recompute is triggered by session end, is idempotent, and is safe to
re-run — which is what makes the free-tier retention purge (drop raw facts, keep
rollups) a one-way door that does not lose the aggregate.

### Transform seam

```java
public interface ResponseTransform {
    int order();
    boolean appliesTo(ExportContext ctx);
    Stream<ResponseFact> apply(Stream<ResponseFact> facts, ExportContext ctx);
}
```

An ordered chain applied at **read time**, never on write. The stored fact is
always the unmodified truth; every reader composes the transforms its context
requires. Built-in implementations in v1:

| Transform | Applies when | Effect |
| --- | --- | --- |
| `IdentityStrip` | anonymity mode | forbids the display-name join; respondent key passes through |
| `KAnonymitySuppression` | anonymity mode, aggregate reads | suppresses cells with n < k (default 5, configurable per deck) |
| `RetentionFilter` | always | excludes facts past the tier's retention window |

The seam exists so that LLM-based PII redaction, profanity filtering,
translation, and open-end coding land as plugins in
[PRD 3](03-research-platform.md) without reopening the projection.

## Migration and backfill

`answers` documents survive round close (`RoundResultProjector.persist` deletes
and re-saves them, it does not discard them), so historic sessions can be
reprojected. A one-shot backfill command walks `LiveSessions` → `answers` →
`ResponseFact`, with these honest degradations recorded in `schemaVersion`:

- No round-open timestamps → all non-responses are `SKIPPED`, latency is null.
- No session start/end → duration is null.
- Registered users get a respondent key derived at backfill time, at the scope
  the run's `anonymousMode` setting implies; historic guests get one-shot keys.
- `deckVersion` **is** computable for historic runs, because `LiveSession.deck`
  is a frozen snapshot — the digest is derived from stored data, not
  reconstructed. This is the one field backfill recovers losslessly.

Decks written before the `inviteSettings` change already fail to deserialize on
read in the dev database, so the backfill must skip-and-log unreadable sessions
rather than abort.

## Storage impact

Worst realistic case: 200 participants × 40 slides × ~3 elements average ≈
24,000 facts per session. At roughly 300 bytes per document that is ~7 MB per
large session; a typical 25-person session is well under 1 MB. Retention
(30 days free, 12 months paid) caps the total. Indexes required:
`(sessionId, slideId)`, `(deckId, deckVersion, slideId)` for pooled reads,
`(orgId, respondentKey)` for longitudinal and erasure lookups, and
`(deckId, respondedAt)` for the purge scan. Created by an explicit initializer,
following `ParticipantIndexInitializer` — auto-index-creation is off.

## Acceptance criteria

1. Every interactive slide type in the table above writes facts at round close,
   verified by a test per type asserting row count, `elementId`, and `valueKind`.
2. A roster member who submits nothing produces exactly one fact per slide with
   a non-`ANSWERED` status, and the count of `ANSWERED` facts equals the count
   of `Answer` documents for that round.
3. Erasing a respondent leaves every non-text fact in place, resolves the key to
   nothing, and leaves all rollup values for non-text slides byte-identical.
4. Rollup recompute is idempotent: running it twice on the same session yields
   the same document.
5. Backfill reprojects an existing session with no data loss for facts that the
   raw `answers` can support, and marks the degraded fields null rather than
   guessing.
6. `scripts/check-feature.sh` clean, including JDT null-analysis.

## Risks

- **Projection drift.** Two write paths (Redis live tally, `ResponseFact`)
  computing what looks like the same number, from the same payload, at different
  times. Mitigation: derive the live tally keys and the facts from one shared
  per-type mapper so a divergence is a compile error rather than a data bug.
- **Denormalized labels going stale** relative to a deck that has since been
  edited. This is intentional — the fact records what was *shown* — but a
  dashboard that joins live deck content will disagree with an export that does
  not. Readers must use the denormalized label, and that rule needs enforcing in
  review.
- **Erasure is incomplete for text.** Deleting a person's verbatims removes the
  content but not the fact that they responded. Whether that residual is
  acceptable is a legal question, not an engineering one, and needs counsel
  before it is claimed to a customer.
- **Org-scoped keys are a materially larger privacy commitment** than deck
  scope. An org can now correlate one employee's answers across every deck it
  runs. That is the stated requirement, and it raises the stakes on the
  anonymity downgrade being correct — if the scope rule is ever bypassed, the
  blast radius is every anonymous run the org has ever held. The scope belongs
  in the key derivation and nowhere else; a reader must never be able to choose
  it. Treat any change to that code path as security-relevant.
- **Deck-version fragmentation.** A digest that is too sensitive splits pooled
  data on cosmetic edits; too loose, and genuinely different instruments pool
  together. The dividing line — what a respondent was asked, not how it
  looked — needs to be enforced by an explicit field allowlist in the digest,
  with a test that a theme change does not move the hash.
- **Scope creep into a warehouse.** Mongo aggregation over `response_facts` is
  adequate at the stated scale and will not be at 100× it. The rollups are the
  pressure valve; resist queries that scan raw facts for dashboard reads.

## Alternatives considered

**Query `answers` on demand, no projection.** No new collection, no backfill, no
drift risk, and always current. Rejected because every reader would need to
interpret 13 payload shapes, non-response cannot be represented at all without
materialising the roster grid anyway, and a deck-pooled query would scan every
answer of every run on each dashboard load. The projection is the thing that
makes the other two PRDs cheap.

**Extend `RoundResult` instead of adding a collection.** Keeps one durable
record per round. Rejected because a round result is inherently
round-shaped — one document holding 200 participants × 12 elements is both a
document-size risk and impossible to index at respondent grain, which is exactly
the grain cross-tabs require.

**Store coordinates in authored units.** Simpler, no conversion. Rejected: pooling
across runs breaks the moment an author resizes the backing image.

## Open questions

1. Where does the retention purge run — a scheduled Spring task, or Mongo TTL
   indexes? TTL is cheaper but cannot do the tier-dependent window or the
   shred-then-delete ordering.
2. What exactly is in the `deckVersion` digest? The principle is settled (what
   was asked, not how it looked); the field allowlist is not. Grading-relevant
   settings clearly count — does `countdownTime`, which changes response
   behaviour without changing the question?
3. When a deck moves between an org and personal ownership, respondent keys
   derived under the old scope no longer match. Do historic facts keep their
   original keys (correct, but linkage breaks at the boundary) or get re-keyed
   (continuous, but requires retaining the mapping the shred is meant to
   destroy)? Keeping the original keys is the safer default.
4. Does an org admin's view of longitudinal per-person data need its own
   entitlement or audit trail, separate from export rights? Org scope makes
   "what did Priya answer across everything" a query someone can now run.
