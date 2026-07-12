# Follow-Up Slides

A **follow-up slide** is chained off a parent scorable slide and, at live-session
runtime, builds its question out of the parent round's participant submissions
(e.g. the parent collects answers; the follow-up presents them as voteable
options). **Currently implemented: authoring only** — adding, editing,
reordering, and deleting follow-ups in the deck editor. The live-session runtime
(consuming submissions, the `VOTE` phase) is future work; see
[Runtime (future)](#runtime-future).

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
`BEST_ANSWER_VOTE` only. `BEST_ANSWER_VOTE` itself has no runtime yet
regardless of parent type — see [Runtime (future)](#runtime-future) — so
today this only pairs the slides at authoring time.

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

## Runtime (future)

Live sessions snapshot the deck's slides verbatim, so `parentId`/`childId` and
the mode carry into rounds with no extra model work. The runtime keys off
`FollowUpMode` + `Slide.parentId`: hold the follow-up until the parent round
resolves, build its options from the parent's submissions (`Round` state, not
deck content), and score via the existing best-answer/deception point settings.
A `FollowUpAnswer` payload variant already exists
(`session/answer/payload/FollowUpAnswer.java`, registered in the sealed
`AnswerPayload` hierarchy and graded a permanent `false` in
`RoundEvaluator.isCorrect`, same as `DrawingAnswer`/`QAndAAnswer`) — it's
sealed-interface scaffolding for this future work, not yet consumed at
runtime; the `VOTE` phase and options-from-submissions logic above are what's
still missing.
