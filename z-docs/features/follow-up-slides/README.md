# Follow-Up Slides

A **follow-up slide** is chained off a parent scorable slide and, at live-session
runtime, builds its question out of the parent round's participant submissions
(e.g. the parent collects answers; the follow-up presents them as pickable
options). Authoring — adding, editing, reordering, and deleting follow-ups in
the deck editor — and the live-session runtime — minting candidates from the
parent round's submissions, running the follow-up as an ordinary round of its
own, and presenting the board — are both implemented; see [Runtime](#runtime).
**Scoring is per-mode**: [`SPOT_THE_ANSWER`](#spot_the_answer) scores — it mixes
the parent's authored answer in among the submissions and pays both the players
who spot it and the players whose own card fooled the room — while
`BEST_ANSWER_VOTE` and `PREDICT_POPULAR` still grade a permanent `false` and
award nothing (see also [Missing Features](../missing-features.md)).

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
| `SPOT_THE_ANSWER`  | `TEXT` **with an answer key** (`TextContent.acceptedAnswers` non-empty)                            | Which of these is the real answer? (the authored one is hidden among the submissions) |

Any scorable slide type can attach a `BEST_ANSWER_VOTE` follow-up. `MCQ` and a
keyed `TEXT` are the parents with more than one valid mode — the author picks
one when adding the follow-up and can change it in the inspector; every other
parent type is `BEST_ANSWER_VOTE` only. `BEST_ANSWER_VOTE` gets the same
runtime as `PREDICT_POPULAR` — see [Runtime](#runtime) — the mode only changes
the board's prompt text, and neither of the two scores (see
[Missing Features](../missing-features.md)). `SPOT_THE_ANSWER` is the one mode
that changes what is minted *and* scores; it has its own
[section](#spot_the_answer).

`FollowUpMode.requiresAnswerKey()` is the authoritative second half of the
pairing rule: `supportsParent` only settles the parent's *type*, and an unkeyed
`TEXT` slide is a legitimate collect-only prompt with no authored answer to
hide. `DeckService` enforces both halves wherever the pairing can change — the
add endpoint, the inspector's mode edit, and a parent content update that would
strip the key out from under an attached `SPOT_THE_ANSWER` child — each a
`400`.

The frontend mirrors the table in
`frontend/src/features/deck/utils/followUp.ts` (`FOLLOW_UP_MODE_PARENTS`),
typed `satisfies Record<FollowUpMode, readonly SlideType[]>` against the
**generated** unions — a new backend mode regenerated into `deckEnums.gen.ts`
breaks compilation there until its row is added, so the mirror can't silently
drift. `utils/followUp.ts` is also the single frontend home of the pairing
rule (`groupIntoUnits`, `attachedFollowUpOf`, `canHaveFollowUp`), shared by the
rail, the optimistic move patch, and the add affordances.

### `SPOT_THE_ANSWER`

A dixit-style mode, and the **first follow-up mode to score**: the parent
question's **authored** correct answer is mixed in among the
participant-submitted candidates, and the room has to spot it.

- **Valid parents** — `TEXT` slides whose content carries an answer key
  (`TextContent.acceptedAnswers` non-empty). A `TEXT` parent with no answer key
  is unscored and has no authored answer to mix in, so it stays
  `BEST_ANSWER_VOTE` only — see `FollowUpMode.requiresAnswerKey()` above.
- **Seeding** — `FollowUpOptions.mint` takes the child's mode, and on this one
  `fromText` seeds the answer key's own wording in beside the deduped
  submissions. One accepted answer stands for the whole set: the first
  non-blank one in iteration order (a stored `Set` field hydrates as a
  `LinkedHashSet`, so that is the authored order, and a live session mints from
  one immutable deck snapshot — every re-mint of a round therefore reads the
  same wording). The wording is **stripped first**, and that stripped form is
  both what the card shows and what the key normalizes from, so the seed obeys
  the same `optionId == derivedId(normalize(displayText))` relation every
  submission card does — keying off the raw wording instead would leave the seed
  as the one card on a `trimWhitespace = false` board whose id doesn't match its
  text.
- **Merging** — the seed is keyed under `TextContent.normalize` exactly as a
  submission is, so a participant who typed the authored answer lands on the
  *same* candidate: one card that is both the answer key and their submission,
  carrying the flag and them as an author. The existing self-pick `409` then
  correctly stops them picking the card they wrote.
- **Where the seeded card lands** — submissions sit in submission order, so
  putting the answer first or last would make it the card the room learns to
  look at. The insertion slot is therefore drawn from a `SecureRandom` over
  `candidates + 1` positions, freshly per mint. It cannot be *derived* from the
  answer instead: a card's text and its board position both travel on
  `FollowUpOptionView`, so any derivation a client can re-run identifies the seed
  outright. Randomness consumes no board-visible input, and nothing depends on
  the arrangement being reproducible — candidate **ids** stay content-derived, so
  a re-mint yields the same cards, only rearranged, and the only paths that
  re-mint (a round open or restart, or a parent replay) clear that round's cast
  answers with it. A *merged* answer is never moved — its position was already
  fixed by the submission it merged with, which leaks nothing.
- **Secrecy** — `FollowUpOption.authoredAnswer` is server-only, exactly like
  `authorParticipantIds`: `FollowUpOptionView` projects only
  id/text/imageUrl, and `FollowUpConfigView` carries no correct-answer field.
  The parent itself never reveals either (`409 REVEAL_BLOCKED_BY_FOLLOW_UP`).
  The card also shows the authored wording **stripped**, so stray padding
  can't render as a tell no submitted card has. The invariant is an *in-round*
  one: at `REVEAL_RESULTS` the round's own outcomes carry each participant's
  `choice` alongside whether it graded `correct`, from which any client can read
  off the authored option id. That is disclosure by design — the round is over —
  and it is why the secrecy argument is about what the board leaks *while it is
  being played*.
- **Graceful degradation** — if the author empties the parent's answer key
  after attaching the follow-up (the editor rejects that, but a session's deck
  snapshot can predate the rule), the mint seeds nothing and produces exactly
  the `BEST_ANSWER_VOTE` board. No candidate carries the flag, so no pick can
  grade correct and the **picker** side scores nobody, rather than the round
  failing. Authors are unaffected: `RoundEvaluator.followUpPicksByAuthor` gates
  on the mode and a non-empty board, not on the flag, so cards that drew picks
  still pay deception points.
- **Scoring** — pickers earn through the ordinary correct-answer path, authors
  through deception points; see *Scoring a follow-up round* under
  [Runtime](#runtime).
- **Image / dixit extension — deferred.** Running the same mode on `DRAWING`
  (image) parents needs an authorable correct-answer *image* to mix in among
  the submitted drawings, which no model carries today; adding one is a model
  change on the parent content or on the follow-up itself. Deliberately
  deferred until that model is designed.
- **Frontend mirror** — the enum value breaks compilation in
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
authors onto whichever submission's wording landed first — and, on a
`SPOT_THE_ANSWER` child, mixes the authored answer in with them
([above](#spot_the_answer)); a DRAWING parent
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
snapshot, never a fresh mint, so all consumers agree on one board. That read is
lenient (`RedisJsonCodec.deserializeLenient`) because the blob outlives a
deploy: a set written before `authoredAnswer` existed reads back with the flag
`false`, which is exactly what "no answer was seeded into this board" means. The
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
`RoundEvaluator.describeChoice` — never `VoteStore`. How it *grades* is the
mode's business: `BEST_ANSWER_VOTE` and `PREDICT_POPULAR` still grade a
permanent `false` in `RoundEvaluator.isCorrect` and award nothing, while
`SPOT_THE_ANSWER` scores — see below.

**Scoring a follow-up round.** A follow-up's answer key is *runtime* state, so
`RoundEvaluator`/`RoundScorer` take the round's saved `FollowUpOptionSet`
alongside the slide — always the `FollowUpOptionStore` snapshot the round
opened on, never a re-mint, so grading can never disagree with the board the
participants picked from. `FollowUpOptionSet.empty()` for every round that
isn't a follow-up. Two independent earnings, both on `SPOT_THE_ANSWER` only:

- **The picker.** `isCorrect` is true when the picked candidate carries
  `authoredAnswer`. From there the ordinary path does the rest — base
  `points`, streak bonuses, and the fastest-correct bonus all arrive through
  the existing `Participant.awardPoints`, with no follow-up special case.
- **The author.** A card that drew picks from *other* participants pays its
  author through the existing `deceivedCount` × `deceptionPoints` mechanic —
  a card that fooled the room is deception, so no new `PointSettings` field.
  `RoundEvaluator.followUpPicksByAuthor` counts picks against the snapshot's
  `authorParticipantIds` (every author of a merged card is credited; self-picks
  excluded), and it pays regardless of whether that card is also the seeded
  answer. Unlike a VOTE-phase deception it is *not* zeroed when the author also
  picked correctly: spotting the answer and writing a card that fooled others
  are two separate things to have done in one round.

**Authors who never answered.** The cards on a follow-up board were written in
the *parent* round, so an author may earn without submitting a pick — and
`RoundScorer` iterates evaluations, which are one-per-answer. `awardAbsentAuthors`
is the extra step that reaches them, with two deliberate consequences:

- **Their streak is untouched.** `awardPoints(false, …)` would record a miss
  and possibly end a streak, which is wrong — not answering is not answering
  *incorrectly*. They go through `Participant.awardDeception` instead, which
  applies the points and nothing else.
- **They get no `ParticipantOutcome`.** A phantom outcome would inflate the
  round's `numberOfParticipants` (defined as the answers it collected) and add
  a fictitious 0 ms response time to its average. Their points land on the
  running `ParticipantScore` — which is what the scoreboard and every later
  snapshot read — while the round's per-participant list stays exactly the set
  of people who played it. The trade-off: the reveal's per-round delta can't
  show them, so scoreboard movement is where their points surface. A banned
  author is skipped entirely.

`RoundEvaluator.correctKey` deliberately grows **no** follow-up branch, so a
follow-up round's `RoundResult.correctOption` stays `null` even when the round
scored: revealing which card was the authored answer is a board affordance
nobody has built yet (see [Missing Features](../missing-features.md)).

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
board. On a mode that seeds the answer key (`requiresAnswerKey`) the second test
is stricter — the mint must hold at least one **non-seeded** candidate, because
the seed alone would open a one-card board where the only pick available is the
authored answer, and the whole room would collect full points, a streak, and the
fastest-correct bonus for reading the only card on screen. `goTo` still rejects
the named slide outright (`409 PARENT_ROUND_NOT_SCORED`).

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
correct-answer affordance ever renders — a `SPOT_THE_ANSWER` round *has* an
answer key, but revealing it is deliberately not built, and
`RoundResult.correctOption` stays `null` for every follow-up round).
Candidates render in snapshot order — deliberately not shuffled, so every
device shows the one board — and picking is single-select regardless of the
parent's own answer settings. The viewer's own candidate is disabled and
badged from `myFollowUpOptionId`, pre-empting the self-pick `409` —
`sendAnswer` is fire-and-forget, so a rejection would never otherwise surface
to the board.
