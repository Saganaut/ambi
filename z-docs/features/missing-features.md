# TODO

- ~~Show results as % (we have counts, but not %).~~ DONE — `AnswerPanel`'s
  `displayResultsAsPercentage` toggle feeds `ResultsDisplaySwitch`, and every
  chart accepts `displayAsPercentage`.
- label for deck heading ADDED TO BACKEND NEED TO ADD TO FRONT
- On MCQ questions, we need to add an option to make the question focus on an image.  Like image mode vs text mode. In image mode the image takes center stage, text mode the image is secondary. Otherwise images could be too small for certain use cases
- vote for hte best answer doesn't make any sense for MCQ, it should only be for free form text or drawings..
- How do we know if a slide is actually scorable?
- We need to use more apply to all:

- Content image should be added directly in the slide.  On hover a box should appear that allows for an upload.. or on mobile a menu or placeholder.

- We have anonymize answers, allow anonynmous responses, and anonymous mode.  We need to make sense of it all.  

- SlideTyepGraphics.tsx right now all these graphic components have the same color and not really modifiable.  We need to be able to change the color easily, so fill and stroke as a prop?  Difficulty is some contain multiple colors.

- Fix modal, come up with consistent style for modals and variants.  sm md lg. Make responsive.

- Input components need to be more re-usable and better styles. For example they should have style defaults and variants but be able to be customized by ecah parent, especially layout.  Also need to allow space for info messages.

- We need to stop using the term player, instead we should use participant

BUGS
~~Allow multiple selection correct answers~~ DONE — `McqContent.correctOptionIds`
is a `Set<String>`, `RoundEvaluator.gradeMcq` does an exact-set match, and the
editor's `toggleCorrect` (in `useMcqEditor.ts`) lets authors mark more than one
option correct.

 --- [ambi] [io-8080-exec-10] .m.m.a.ExceptionHandlerExceptionResolver : Resolved [org.springframework.http.converter.HttpMessageNotReadableException: JSON parse error: Cannot map `null` into type `boolean` (set `DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES` to 'false' to allow)]

FUTURE (NOT TO BE WORKED ON NOW):

- Response segmentation
- Response moderations
- Reactions (we already have emojies so how can we reconcile these).

## Follow-up slides (deferred)

The [follow-up slide](follow-up-slides/README.md) live-session runtime shipped
(minting, the pick-is-the-answer round, the board), but several pieces named
in its design were deliberately left for later:

- **Scoring on the other two modes.** `SPOT_THE_ANSWER` scores — see
  [follow-up slides](follow-up-slides/README.md#spot_the_answer) — but a
  `BEST_ANSWER_VOTE` or `PREDICT_POPULAR` pick still grades `false` and awards
  nothing. Neither has an answer key, and paying the most-picked submission is
  a scoring pass over the whole field rather than a per-answer grade.
- **Revealing the spotted answer.** A `SPOT_THE_ANSWER` round grades picks,
  but `RoundEvaluator.correctKey` deliberately grows no follow-up branch, so
  `RoundResult.correctOption` stays `null` and the board renders no
  correct-answer affordance at reveal — the mode is scoring-only for now.
- **Dixit on image parents.** Running `SPOT_THE_ANSWER` on `DRAWING` parents
  needs an authorable correct-answer *image* to mix in among the submitted
  drawings, which no model carries today; adding one is a model change on the
  parent content or on the follow-up itself.
- **Shuffle.** Candidates always render in snapshot (mint) order — no
  per-viewer shuffle — a deliberate v1 decision
  (`FollowUpBoardContent`), not yet revisited.
- **Per-participant STOMP user-destination channel.** `myFollowUpOptionId`
  (which candidate the viewer authored) can only travel on the REST
  snapshot today, because it's per-participant while the session's STOMP
  topic is shared by every client. `SessionConnectionProvider` works around
  this with a one-time snapshot refetch per follow-up round
  (keyed `slideId@roundStartedAt`); a dedicated per-user STOMP destination
  would let this ride the broadcast instead.
- **Historical option text.** `FollowUpOptionStore`'s Redis snapshot (6h
  TTL) is the only place a follow-up round's candidate text/images live —
  the persisted `RoundResult.optionCounts` only carries derived option ids.
  Once the snapshot expires, a past follow-up round's results are still
  countable but no longer interpretable (an id with no text/image behind
  it). Persisting the option text/images alongside the round result would
  fix this.
- **`AFTER_FOLLOWUP` enum retirement.** `ResultsDisplayMode.AFTER_FOLLOWUP`
  predates this runtime and is retired from the deck editor's
  reveal-results dropdown (shown only as a reselectable "(legacy)" entry
  when an existing slide already carries it). The wire enum value itself
  is still kept for back-compat; removing it outright is future cleanup
  once no decks reference it.
