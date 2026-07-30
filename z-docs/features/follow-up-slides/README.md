# Follow-Up Slides

A **follow-up slide** is chained off a parent scorable slide and, at live-session
runtime, builds its question out of the parent round's participant submissions
(e.g. the parent collects answers; the follow-up presents them as pickable
options). Authoring — adding, editing, reordering, and deleting follow-ups in
the deck editor — and the live-session runtime — minting candidates from the
parent round's submissions, running the follow-up as an ordinary round of its
own, and presenting the board — are both implemented; see [Runtime](#runtime).
**Scoring is not**: a follow-up pick always grades `false` in v1 and never
awards points, whichever `FollowUpMode` it runs — see
[Missing Features](../missing-features.md) for the planned scoring modes.

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

| Mode               | Valid parents            | Question it asks                                                                  |
| ------------------ | ------------------------ | --------------------------------------------------------------------------------- |
| `PREDICT_POPULAR`  | `MCQ`                    | Which option was picked most?                                                     |
| `BEST_ANSWER_VOTE` | `MCQ`, `TEXT`, `DRAWING` | Which submission was best? (vote — picked options on MCQ, free-form answers else) |

`MCQ`, `TEXT`, and `DRAWING` slides are all creatable in the editor today, so
a follow-up can attach to any of them. `MCQ` is the only parent with more
than one valid mode — the author picks one when adding the follow-up and can
change it in the inspector; `TEXT` and `DRAWING` parents are
`BEST_ANSWER_VOTE` only. `BEST_ANSWER_VOTE` gets the same runtime as
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
free-text/drawing submissions (open-decisions D3). A follow-up's pick already
**is** the round's answer, so it travels the ordinary answer path instead.

**Minting the candidates.** `session/followUp/FollowUpOptions` derives the
board's candidate set from the parent slide and the answers its round
collected: an MCQ parent hands back its own authored options verbatim (same
ids, same order, no submitters); a TEXT parent dedupes submissions under the
parent's own trim/case normalization (`TextContent.normalize`), unioning
authors onto whichever submission's wording landed first; a DRAWING parent
mints one candidate per submitted image, keyed by its stored `srcKey`. Every
candidate's id is a UUID hashed from the content it stands for, never random,
so re-minting over the same submissions reproduces the same set — a round
restart doesn't orphan votes already cast against it.

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
