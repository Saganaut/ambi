# Follow-Up Slides

A **follow-up slide** is chained off a parent scorable slide and, at live-session
runtime, builds its question out of the parent round's participant submissions
(e.g. the parent collects answers; the follow-up presents them as pickable
options). Authoring — adding, editing, reordering, and deleting follow-ups in
the deck editor — and the live-session runtime — minting candidates from the
parent round's submissions, running the follow-up as an ordinary round of its
own, and presenting the board — are both implemented; see [Runtime](#runtime).
**Scoring is not**: a follow-up pick always grades `false` in v1 and never
awards points, whichever `FollowUpMode` it runs — the designed path to scoring
is the planned [`SPOT_THE_ANSWER`](#planned-spot_the_answer-working-name) mode
(see also [Missing Features](../missing-features.md)).

## Model

- The parent/child link lives on the slides themselves: `Slide.parentId` /
  `Slide.childId` — **server-owned**. The only way to mint a link is the
  dedicated endpoint below; deletes clear or cascade it. `SlideRequest` carries
  neither field, so a slide update can never rewrite a link.
- A link is **real** only when both back-pointers agree *and* the child's
  content is `FollowUpContent`. Anything else (dangling ids, half-written
  legacy links) degrades to plain unlinked slides everywhere, and
  `addFollowUpSlide` self-heals a dangling `childId` before attaching.
- `FollowUpContent` is just `{ mode: FollowUpMode }`. Submissions are runtime
  session data, not deck content, so nothing else is authorable; the question
  prompt is `Slide.title`, like every other kind.

## Invariants

1. **Adjacency** — a follow-up sits immediately after its parent. The add
   endpoint ranks it between the parent and its successor; a move targets the
   *unit* (parent + follow-up move as one block), the target index is
   normalized so a unit can never land inside another pair, and moving a
   follow-up itself is rejected (`400`) — it only moves with its parent.
2. **Multiplicity** — at most one follow-up per slide (`409 FOLLOW_UP_EXISTS`),
   no chains (a follow-up can't have its own follow-up), and only scorable,
   non-follow-up parents qualify.
3. **Cascade delete** — deleting the parent deletes its attached follow-up
   (the editor confirms first); deleting just the follow-up clears the
   parent's `childId`.

## Endpoint

`POST /api/decks/{id}/slides/{slideId}/follow-up` (EDIT) with
`AddFollowUpRequest { id, mode, title? }` → `201` + the deck's slides in
canonical order (the operation touches two slides and inserts mid-list, so the
client reconciles its cache from the response, like a move).

## Modes

`FollowUpMode` declares which parent content types each mode supports — the
backend enum (`presentation/slide/enums/FollowUpMode.java`) is the
authoritative validator:

| Mode               | Valid parents                                                                                    | Question it asks                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `PREDICT_POPULAR`  | `MCQ`                                                                                              | Which option was picked most?                                                     |
| `BEST_ANSWER_VOTE` | every scorable parent except `FOLLOW_UP` itself: `MCQ`, `TEXT`, `DRAWING`, `NUMBER`, `RANKING`, `SCALES`, `GRID`, `AXIS`, `PLACE_ON_IMAGE`, `MATCHING`, `ALLOCATION` | Which submission was best? (vote — picked options on MCQ, a compact text summary on every other kind) |

Any scorable slide type can attach a `BEST_ANSWER_VOTE` follow-up. `MCQ` is
the only parent with more than one valid mode — the author picks one when
adding the follow-up and can change it in the inspector; every other parent
type is `BEST_ANSWER_VOTE` only. `BEST_ANSWER_VOTE` gets the same runtime as
`PREDICT_POPULAR` — see [Runtime](#runtime) — the mode only changes the
board's prompt text; neither mode scores in v1 (see
[Missing Features](../missing-features.md)).

The frontend mirrors the table in
`frontend/src/features/deck/utils/followUp.ts` (`FOLLOW_UP_MODE_PARENTS`),
typed `satisfies Record<FollowUpMode, readonly SlideType[]>` against the
**generated** unions — a new backend mode regenerated into `deckEnums.gen.ts`
breaks compilation there until its row is added, so the mirror can't silently
drift. `utils/followUp.ts` is also the single frontend home of the pairing
rule (`groupIntoUnits`, `attachedFollowUpOf`, `canHaveFollowUp`), shared by the
rail, the optimistic move patch, and the add affordances.

### Planned: `SPOT_THE_ANSWER` (working name)

**Planned, not built.** `FollowUpMode` declares exactly two values today
(`BEST_ANSWER_VOTE`, `PREDICT_POPULAR`); nothing below exists in code yet, and
the working name isn't final until the enum value lands. This section records
the settled design (confirmed 2026-07-30), not shipped behavior — the two
built modes above are unaffected by it.

A dixit-style third mode: the parent question's **authored** correct answer is
mixed in among the participant-submitted candidates, and the room has to spot
it.

- **Valid parents** — `TEXT` slides whose content carries an answer key
  (`TextContent.acceptedAnswers` non-empty). A TEXT parent with no answer key
  is unscored and has no authored answer to mix in, so it stays
  `BEST_ANSWER_VOTE` only.
- **Minting** — at mint time the authored answer is seeded into the candidate
  set alongside the deduped submissions, indistinguishable from them on the
  board. Today `FollowUpOptions.fromText` mints candidates *only* from
  `TextAnswer` submissions and never reads `acceptedAnswers`, so this is the
  one place the mint has to change. The seeded candidate has no submitter,
  which the existing shape already allows (an MCQ parent's authored options
  mint with no authors either) — and, like `authorParticipantIds`, the fact
  that a candidate *is* the authored answer must never travel to a client:
  `FollowUpConfigView` carries no correct-answer field today, and the parent
  itself never reveals (`409 REVEAL_BLOCKED_BY_FOLLOW_UP`).
- **Scoring** — this would be the **first follow-up mode to score**, and the
  scoring is part of the settled design, not an afterthought: a participant
  who picks the authored answer earns points, and a participant whose own
  submission draws picks from others earns points too. The hooks are
  `RoundEvaluator.isCorrect`'s `FollowUpAnswer` case — an unconditional
  `false` today that never inspects `FollowUpMode` — and `RoundScorer.score`.
  Exact point values and how they plumb through settings are left to
  implementation.
- **Image / dixit extension — deferred.** Running the same mode on `DRAWING`
  (image) parents needs an authorable correct-answer *image* to mix in among
  the submitted drawings, which no model carries today; adding one is a model
  change on the parent content or on the follow-up itself. Deliberately
  deferred until that model is designed.
- **Frontend mirror** — adding the enum value breaks compilation in
  `FOLLOW_UP_MODE_PARENTS` (`frontend/src/features/deck/utils/followUp.ts`)
  until its row is added, so the parent-type table above can't silently drift.

## Editor UX

- **Add**: "Add follow-up slide" in an eligible slide's thumbnail context menu
  (fast path) and in the inspector's Follow-up section (discoverable home).
  Creation defaults to the first valid mode; the inspector changes it after.
- **Rail**: the left rail renders *units* — a follow-up shows as an indented
  tile attached under its parent, numbered `Na`, selectable but not draggable;
  dragging the parent drags the pair. `FOLLOW_UP` is excluded from the New
  Slide picker.
- **Canvas**: `FollowUpSlideContent` — prompt, mode banner, and a read-only
  preview (ghosted parent options for `PREDICT_POPULAR`) that makes the
  runtime contract legible without runtime data.
- **Move index math**: three index spaces exist (dnd unit index → frontend
  flat index → server flat index). The unit→flat conversion happens in exactly
  one place (`useDeckEditor.handleDragEnd`); the optimistic patch and the
  server apply the same snap-normalization, and the move/add responses carry
  the full canonical list so any divergence self-heals on reconcile.

## Runtime

Live sessions snapshot the deck's slides verbatim, so `Slide.parentId`/
`childId` and the mode carry into rounds with no extra model work. A
follow-up round is a **regular round**, not a special phase: it runs the same
`SUBMIT` → (optional `SUBMIT_LIVE`) → `LOCKED`/`REVEAL_RESPONSES` →
`REVEAL_RESULTS` sequence as any other slide, and does **not** use the `VOTE`
phase — that machinery stays reserved for voting on the *current* round's own
free-text/drawing submissions (open-decisions
[D3](../../live-session-open-decisions.md#d3-best-answer--deception-are-hard-coded-off)).
A follow-up's pick already
**is** the round's answer, so it travels the ordinary answer path instead.

**Minting the candidates.** `session/followUp/FollowUpOptions` derives the
board's candidate set from the parent slide and the answers its round
collected: an MCQ parent hands back its own authored options verbatim (same
ids, same order, no submitters); a TEXT parent dedupes submissions under the
parent's own trim/case normalization (`TextContent.normalize`), unioning
authors onto whichever submission's wording landed first; a DRAWING parent
mints one candidate per submitted image, keyed by its stored `srcKey`. Every
other scorable parent kind (`NUMBER`, `RANKING`, `SCALES`, `GRID`, `AXIS`,
`PLACE_ON_IMAGE`, `MATCHING`, `ALLOCATION`) has no submission a board can show
verbatim, so its answers are rendered into a compact text summary built from
the parent's own authored labels — a number with its unit, a ranking as
`"Alpha > Beta > Gamma"`, a match as `"Alpha ↔ X · Beta ↔ Y"`, a grid
placement as `"Alpha → Mammal/Africa"`, an allocation as `"Alpha 60 · Beta 40"`
(points, not percentages), a scale position denormalized to scale units, and
an axis/place-on-image placement as whole-percent coordinates. That rendered
summary doubles as both the candidate's display text and its dedup key, so
two submissions that render identically merge into one candidate. Every
candidate's id is a UUID hashed from the content it stands for (the summary
text for these kinds), never random, so re-minting over the same submissions
reproduces the same set — a round restart doesn't orphan votes already cast
against it. See `FollowUpOptions`'s class Javadoc and its `summaryOf`
overloads for the exact per-type formats.

**Snapshot, not re-mint-per-read.** The mint runs once, when the follow-up
round opens, and is written to Redis (`FollowUpOptionStore`,
`ambi:session:followup:{sessionId}:{slideId}`, 6h TTL) as a single ordered
JSON value — a Hash has no ordering to preserve, and the board's numbered
layout is part of what every participant shares. Every later read (the board,
a late-joiner's snapshot, the answer validator) comes back from that saved
snapshot, never a fresh mint, so all consumers agree on one board. The
parent round's answers backing the mint are read from Redis if that round is
still open, falling back to the flushed Mongo copy
(`RoundResultProjector.answersOf`) once it has closed — persisting a round's
answers **replaces** the prior set rather than appending, so a re-scored round
can't leave two runs' answers layered on top of each other.

**The pick is the answer.** `FollowUpAnswer { optionId }`
(`session/answer/payload/FollowUpAnswer.java`, in the sealed `AnswerPayload`
hierarchy) carries the candidate a participant picked, and it's re-castable
until the round closes (the answer service zeroes `maxSelections` for it). It
rides the regular answer/tally path — submit, live tally
(`AnswerTallyKeys`), `RoundResult.optionCounts` via
`RoundEvaluator.describeChoice` — never `VoteStore`. It also grades a
permanent `false` in `RoundEvaluator.isCorrect`: v1 has no answer key and
awards no points for a follow-up round, whichever `FollowUpMode` it runs (see
[Missing Features](../missing-features.md) for the scoring modes that would
change that).

**One store for votes (direction, decided 2026-07-30).** A vote *is* an answer
to a follow-up question, so voting features go through the answer store from
here on — exactly as this runtime already does. The separate `VoteStore`
behind the same-round `VOTE` phase (open-decisions
[D3](../../live-session-open-decisions.md#d3-best-answer--deception-are-hard-coded-off))
is unchanged and still shipped, but **deprecated in direction**: new voting
work must not extend it, and it is eventually to be reworked onto — or
replaced by — the answer-store pattern. Nothing about the built VOTE-phase
feature changes today; this only settles which way new work goes.

**The parent never reveals.** `LiveSessionOrchestrator` wires the round
itself: opening a follow-up snapshots its candidates first — minted from the
parent round's answers and saved to `FollowUpOptionStore` — before the
round-started event is published, so the board is never live without its
options. Opening the *parent* again (a restart) replays the pair, clearing
the child's per-round Redis state with it. `revealResults` on a slide with an
attached follow-up is rejected unconditionally, regardless of the slide's own
`resultsDisplayMode` (`409 REVEAL_BLOCKED_BY_FOLLOW_UP`) — the host closes the
parent and advances, and the follow-up round is where the parent's results are
presented. Navigation skips a follow-up that can't be played (parent never
scored, or its submissions mint no candidates) rather than opening an empty
board; `goTo` still rejects the named slide outright
(`409 PARENT_ROUND_NOT_SCORED`).

A pre-existing `ResultsDisplayMode.AFTER_FOLLOWUP` value predates this design
and is retired from the deck editor's reveal-results dropdown (the wire enum
keeps the value for back-compat): a deck authored before this runtime settled
could still carry it on a slide, and the settings UI shows it as a
clearly-labelled, reselectable "(legacy)" entry rather than silently dropping
it — picking any other entry moves the slide off the legacy value for good.

**On the wire.** A follow-up round's `SlideView` carries `FollowUpConfigView`
(mode, parent id/title, and the candidates as `FollowUpOptionView`); a slide
that *has* an attached follow-up carries `hasFollowUp` instead, so the host
bar knows the round never reveals and advances into the child. Both are
resolved by the caller against the deck (`SlideView.from` has no deck access),
and the candidates are read back from the saved `FollowUpOptionStore`
snapshot, never re-minted. **`authorParticipantIds` never travels**: like
`VoteOptionView`, the id→author mapping stays server-side, which is also what
makes the self-pick check trustworthy. `LiveSessionSnapshotService` adds the
per-viewer `myFollowUpOptionId` — the candidate the caller authored — which
can only travel on the snapshot, never a broadcast, since it's per-participant
on a topic every client shares. The frontend provider refetches the snapshot
once per follow-up round, keyed on `slideId@roundStartedAt`, so a client that
was already connected when the round opened still picks the field up.

`LiveSessionAnswerService` validates a pick against that snapshot rather than
any authored content (the board is runtime state): a blank id or one absent
from the round's set is a `400`, and picking one's own candidate is the same
`409 CANNOT_VOTE_FOR_OWN_ANSWER` `submitVote` raises.

**Board UI.** `FollowUpBoardContent`, under the live session's
`components/SessionBoard/content/`, reached from `BoardQuestion`'s
`FOLLOW_UP` case, covers every moment with one component switched by mode:
`prompt` (pickable cards), `liveResults` (the same cards with the running
tally filling in — still pickable, since a pick stays re-castable), and
`results` (the final distribution, most-picked card(s) badged; no
correct-answer affordance ever renders, since a follow-up has no answer key).
Candidates render in snapshot order — deliberately not shuffled, so every
device shows the one board — and picking is single-select regardless of the
parent's own answer settings. The viewer's own candidate is disabled and
badged from `myFollowUpOptionId`, pre-empting the self-pick `409` —
`sendAnswer` is fire-and-forget, so a rejection would never otherwise surface
to the board.
