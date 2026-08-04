# Follow-Up Slides

A **follow-up slide** is chained off a parent scorable slide and builds its
question, at live-session runtime, out of that parent round's participant
submissions. Authoring and runtime are both implemented. **Scoring is
per-mode:** `SPOT_THE_ANSWER` scores — it mixes the parent's authored answer in
among the submissions and pays both the players who spot it and the players
whose own card fooled the room — while `BEST_ANSWER_VOTE` and `PREDICT_POPULAR`
grade a permanent `false` and award nothing (see [Deferred](#deferred)).

## Model

- The parent/child link lives on the slides: `Slide.parentId` / `Slide.childId`, **server-owned**. The only way to mint one is the dedicated endpoint; deletes clear or cascade it. `SlideRequest` carries neither field, so a slide update can never rewrite a link.
- A link is **real** only when both back-pointers agree *and* the child's content is `FollowUpContent`. Anything else — dangling ids, half-written legacy links — degrades to plain unlinked slides everywhere, and `addFollowUpSlide` self-heals a dangling `childId` before attaching.
- `FollowUpContent` is just `{ mode: FollowUpMode }`. Submissions are runtime session data, not deck content, so nothing else is authorable; the prompt is `Slide.title`, like every other kind.

### Invariants

1. **Adjacency** — a follow-up sits immediately after its parent. The add endpoint ranks it between parent and successor; a move targets the *unit* (parent + follow-up move as one block), the target index is normalized so a unit can never land inside another pair, and moving a follow-up alone is a `400`.
2. **Multiplicity** — at most one follow-up per slide (`409 FOLLOW_UP_EXISTS`), no chains, and only scorable non-follow-up parents qualify.
3. **Cascade delete** — deleting the parent deletes its follow-up (the editor confirms first); deleting the follow-up clears the parent's `childId`.

Endpoint: `POST /api/decks/{id}/slides/{slideId}/follow-up` (EDIT) with
`AddFollowUpRequest { id, mode, title? }` → `201` + the deck's slides in
canonical order, since the operation touches two slides and inserts mid-list.

## Modes

`FollowUpMode` (`presentation/slide/enums/FollowUpMode.java`) is the
authoritative validator for which parent content types each mode accepts:

| Mode | Valid parents | Question it asks |
|---|---|---|
| `PREDICT_POPULAR` | `MCQ` | Which option was picked most? |
| `BEST_ANSWER_VOTE` | every scorable parent except `FOLLOW_UP` | Which submission was best? |
| `SPOT_THE_ANSWER` | a parent **with an authored answer**: `TEXT` with non-empty `acceptedAnswers`, or `DRAWING` with an authored `correctImage` | Which of these is the real answer? |

`supportsParent` settles the parent's *type*; `requiresAnswerKey()` is the
second half of the rule, because an unkeyed `TEXT` slide (or a Drawing with no
authored image) is a legitimate collect-only prompt with nothing to hide.
**What "an authored answer" means is per parent kind, and
`DeckService.hasAnswerKey` is the single place that resolves it** — deliberately
the exact negation of the frontend's `isImageEmpty`, so the mode the editor
offers and the mode the API accepts agree by construction. `DeckService`
enforces both halves at the add endpoint, the inspector's mode edit, and a
parent content update that would strip the answer out from under an attached
`SPOT_THE_ANSWER` child; each is a `400`.

The frontend mirrors the table in `deck/utils/followUp.ts`
(`FOLLOW_UP_MODE_PARENTS`), typed `satisfies Record<FollowUpMode, readonly
SlideType[]>` against the **generated** unions — a new backend mode breaks
compilation there until its row is added. That file is also the single frontend
home of the pairing rule (`groupIntoUnits`, `attachedFollowUpOf`,
`canHaveFollowUp`), shared by the rail, the optimistic move patch, and the add
affordances.

## Editor UX

Add from an eligible slide's thumbnail context menu (fast path) or the
inspector's Follow-up section (discoverable home); creation defaults to the
first valid mode. The rail renders *units* — the follow-up is an indented tile
numbered `Na`, selectable but not draggable, and dragging the parent drags the
pair. `FollowUpSlideContent` shows the prompt, a mode banner, and a read-only
preview that makes the runtime contract legible without runtime data.

**Move index math is the sharp edge**: three index spaces exist (dnd unit index
→ frontend flat index → server flat index). The unit→flat conversion happens in
exactly one place (`useDeckEditor.handleDragEnd`); the optimistic patch and the
server apply the same snap-normalization, and move/add responses carry the full
canonical list so any divergence self-heals on reconcile.

## Runtime

A follow-up round is a **regular round**, not a special phase: same `SUBMIT` →
(optional `SUBMIT_LIVE`) → `LOCKED`/`REVEAL_RESPONSES` → `REVEAL_RESULTS`
sequence, and it does **not** use the `VOTE` phase — that machinery stays with
same-round voting on free-text/drawing submissions
([the `VOTE` phase](../../diagrams/live-session.md)).

**Mint.** `session/followUp/FollowUpOptions` derives the candidate set from the
parent slide and its round's answers. An MCQ parent hands back its authored
options verbatim; a TEXT parent dedupes submissions under
`TextContent.normalize`; a DRAWING parent mints one candidate per submitted
image keyed by `srcKey`; every other scorable kind renders its answers into a
compact text summary built from the parent's own authored labels, which doubles
as the candidate's display text and its dedup key. **Read
`FollowUpOptions`'s class Javadoc and its `summaryOf` overloads for the exact
per-type formats.** Candidate ids are UUIDs hashed from the content they stand
for, never random, so re-minting over the same submissions reproduces the same
set and a round restart doesn't orphan votes already cast.

**Snapshot, not re-mint-per-read.** The mint runs once, when the round opens,
and is written to Redis (`FollowUpOptionStore`,
`ambi:session:followup:{sessionId}:{slideId}`, 6h TTL) as one ordered JSON
value. Every later read — the board, a late-joiner's snapshot, the answer
validator, the grader — comes back from that snapshot, so all consumers agree
on one board. The read is lenient (`RedisJsonCodec.deserializeLenient`) because
the blob outlives a deploy. Backing answers come from Redis while the parent
round is open, falling back to the flushed Mongo copy once it closes.

**The pick is the answer.** `FollowUpAnswer { optionId }` rides the ordinary
answer/tally path — submit, live tally, `RoundResult.optionCounts` via
`describeChoice` — never `VoteStore`, and it stays re-castable until the round
closes via the [whole-answer resubmit override](../axis-slides/README.md#whole-answer-resubmit-override).
`LiveSessionAnswerService` validates a pick against the *snapshot*, not
authored content: a blank or absent id is a `400`, and picking one's own
candidate is `409 CANNOT_VOTE_FOR_OWN_ANSWER`.

**Scoring.** `RoundEvaluator`/`RoundScorer` take the round's saved
`FollowUpOptionSet` alongside the slide — always the snapshot the round opened
on, so grading can never disagree with the board people picked from
(`FollowUpOptionSet.empty()` for non-follow-up rounds). On `SPOT_THE_ANSWER`
only, two independent earnings: the **picker** is correct when the picked
candidate carries `authoredAnswer`, and everything downstream (base points,
streaks, fastest-correct) is the ordinary path with no special case; the
**author** of a card that drew picks from *others* is paid through the existing
`deceivedCount × deceptionPoints` mechanic, and unlike a VOTE-phase deception
it is not zeroed when the author also picked correctly. Authors who never
submitted a pick are reached by `awardAbsentAuthors`, which goes through
`Participant.awardDeception` and mints no `ParticipantOutcome` — so streaks and
the round's participant count stay honest.

## Gotchas

- **The parent never reveals.** `revealResults` on a slide with an attached follow-up is rejected unconditionally, regardless of its own `resultsDisplayMode` (`409 REVEAL_BLOCKED_BY_FOLLOW_UP`). The host closes the parent and advances; the follow-up round is where the parent's results are presented.
- **Playability gating differs by entry point.** Navigation *skips* a follow-up whose parent never scored or whose submissions mint no candidates; `goTo` applies the same rule but *rejects*, splitting the reasons because they mean different things to the host — `409 PARENT_ROUND_NOT_SCORED` vs `409 FOLLOW_UP_NOT_PLAYABLE`. On a mode that seeds an answer key the test is stricter: the mint must hold at least one **non-seeded** candidate, or the whole room would collect full points for reading the only card on screen.
- **Board order is server-owned.** Candidates render in snapshot order and the client never reorders them. A `SPOT_THE_ANSWER` board is shuffled per mint with `SecureRandom`; ids are content-derived, so a re-mint reproduces the same cards in a different order. Shuffling *everything* rather than hiding the seed in a random slot is the point — independent permutations are what stop a diff-two-boards attack. Secrecy is an **in-round** property: at `REVEAL_RESULTS` the outcomes disclose which option graded correct, by design.
- **Candidate images travel as opaque URLs.** `LiveSessionOrchestrator.followUpCandidateImageUrl` mints a signed [opaque proxy URL](../../diagrams/media-gallery.md#opaque-image-proxy--urls-that-hide-their-key) rather than presigning S3, because a path-style presigned URL spells its key out — `drawing/…` vs `gallery/…` would hand the seeded answer to anyone with devtools open, and proxying only the seed is the same tell. It also outlives the presigner: the URLs are frozen into a 6h snapshot while `ambi.media.presign-ttl` is 1h. External images own no stored object and pass through as-is.
- **The content itself can give a Drawing seed away.** Nothing about the URL, id, arrangement or markup distinguishes the seeded card — but a polished illustration among six freehand sketches is spotted at a glance. There is no mitigation in code; the editor's hint and the draw-it-yourself path are the whole answer.
- **`myFollowUpOptionId` can only ride the snapshot.** It is per-viewer while the STOMP topic is shared, so `SessionConnectionProvider` refetches once per follow-up round keyed on `slideId@roundStartedAt`. That same refetch is what converges every client on a re-minted board after a restart (`SessionConnectionProvider.test.tsx`).
- **`authorParticipantIds` never travels.** The id→author mapping stays server-side, which is what makes the self-pick check trustworthy. The viewer's own candidate is disabled and badged from `myFollowUpOptionId`, pre-empting the `409` — `sendAnswer` is fire-and-forget, so a rejection would never otherwise surface.
- **Graceful degradation.** If the parent's authored answer is emptied after the follow-up is attached (the editor blocks it, but a session's deck snapshot can predate the rule), the mint seeds nothing and produces exactly the `BEST_ANSWER_VOTE` board — no candidate carries the flag, so no pick grades correct. Authors are still paid, because `followUpPicksByAuthor` gates on the mode and a non-empty board, not on the flag.

The reasoning behind the shuffle, the opaque URLs, and the absent-author
payout is carried in the Javadoc of `FollowUpOptions`, `FollowUpOptionStore`,
`OpaqueImageUrls` and `RoundScorer` — read those before changing any of it.

## Deferred

The runtime shipped, but several pieces named in its design were deliberately
left for later:

- **Scoring on the other two modes.** A `BEST_ANSWER_VOTE` or `PREDICT_POPULAR` pick still grades `false` and awards nothing. Neither has an answer key, and paying the most-picked submission is a scoring pass over the whole field rather than a per-answer grade.
- **Revealing the spotted answer.** `RoundEvaluator.correctKey` deliberately grows no follow-up branch, so `RoundResult.correctOption` stays `null` even on a scored `SPOT_THE_ANSWER` round and the board renders no correct-answer affordance at reveal.
- **Shuffle on the unscored modes.** Only `SPOT_THE_ANSWER` shuffles. Every other mode renders in derived snapshot order (authored for MCQ, submission order elsewhere) — deliberate, since that order is meaningful there, but it does mean a best-answer board discloses the sequence its submissions arrived in.
- **Per-participant STOMP user-destination channel.** Would let `myFollowUpOptionId` ride the broadcast instead of the snapshot-refetch workaround above.
- **Historical option text.** The 6h Redis snapshot is the only place candidate text/images live; persisted `RoundResult.optionCounts` carries only derived ids. Once it expires a past follow-up round's results are countable but no longer interpretable. Persisting option text alongside the round result would fix it.
- **`AFTER_FOLLOWUP` enum retirement.** `ResultsDisplayMode.AFTER_FOLLOWUP` predates this runtime and is retired from the reveal-results dropdown, shown only as a reselectable "(legacy)" entry when a slide already carries it. Removing the wire value outright is future cleanup once no decks reference it.
