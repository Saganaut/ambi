// Follow-up slide pairing rules, mirrored from the backend.
//
// A parent/follow-up link is real only when BOTH back-pointers agree
// (`parent.childId === child.id` and `child.parentId === parent.id`) and the
// child's content is FOLLOW_UP — the same attachment check `Deck` applies on
// the server, so dangling legacy links degrade to plain slides here too. This
// module is the single home for that rule: the rail's unit grouping, the
// optimistic move patch, and the add-follow-up affordances all derive from it.
import type { SlideContent, SlideResponse } from "@deck/store/deckApi.gen";
import type { FollowUpMode, SlideType } from "@deck/store/deckEnums.gen";
import { isImageEmpty } from "@utils/image";

/**
 * Which parent content types each follow-up mode supports. Mirror of the
 * backend's `FollowUpMode.validParentTypes` (the authoritative validator);
 * the `satisfies` clause is the drift tripwire — a new mode regenerated into
 * `deckEnums.gen.ts` breaks compilation here until its row is added.
 */
const FOLLOW_UP_MODE_PARENTS = {
  BEST_ANSWER_VOTE: [
    "MCQ",
    "TEXT",
    "DRAWING",
    "NUMBER",
    "RANKING",
    "SCALES",
    "GRID",
    "AXIS",
    "PLACE_ON_IMAGE",
    "MATCHING",
    "ALLOCATION",
  ],
  PREDICT_POPULAR: ["MCQ"],
  SPOT_THE_ANSWER: ["TEXT", "DRAWING"],
} as const satisfies Record<FollowUpMode, readonly SlideType[]>;

/**
 * Whether each mode needs the parent to carry an authored answer key. Mirror of
 * the backend's `FollowUpMode.requiresAnswerKey()`, and exhaustive by the same
 * `satisfies` tripwire {@link FOLLOW_UP_MODE_PARENTS} uses — a second keyed
 * mode has to be answered for here rather than silently defaulting to "no key
 * needed", which would offer it on a keyless parent the API then rejects and
 * let an answer-key edit orphan it.
 */
const FOLLOW_UP_MODE_NEEDS_ANSWER_KEY = {
  BEST_ANSWER_VOTE: false,
  PREDICT_POPULAR: false,
  SPOT_THE_ANSWER: true,
} as const satisfies Record<FollowUpMode, boolean>;

/**
 * The keyed modes from that table — the single gate both
 * {@link followUpModesFor} and {@link wouldOrphanKeyedFollowUp} test, so
 * neither compares a mode name literally.
 */
const FOLLOW_UP_MODES_REQUIRING_ANSWER_KEY: ReadonlySet<FollowUpMode> = new Set(
  (Object.keys(FOLLOW_UP_MODE_NEEDS_ANSWER_KEY) as FollowUpMode[]).filter(
    (mode) => FOLLOW_UP_MODE_NEEDS_ANSWER_KEY[mode],
  ),
);

/** Author-facing label for each mode (canvas banner + inspector select). */
const FOLLOW_UP_MODE_LABELS = {
  BEST_ANSWER_VOTE: "Vote for the best answer",
  PREDICT_POPULAR: "Predict the most popular answer",
  SPOT_THE_ANSWER: "Spot the real answer",
} as const satisfies Record<FollowUpMode, string>;

/**
 * Whether a slide's content carries the authored answer a keyed mode
 * (`SPOT_THE_ANSWER`) hides among the submissions. What that answer *is*
 * depends on the parent kind, so the rule is resolved per content type — the
 * mirror of the backend's `DeckService.hasAnswerKey`:
 *
 * - `TEXT` — at least one *non-blank* accepted answer. Trimmed entries, not
 *   list length: a key holding only blank strings would otherwise offer the
 *   mode in the UI and then be rejected with a 400.
 * - `DRAWING` — a `correctImage` that is stored (not an external URL, which
 *   owns no object the board could serve opaquely beside the submitted
 *   drawings) and holds an object the board can serve — a variant, or the
 *   original alone while its renditions are still being derived — exactly
 *   `!isImageEmpty`.
 * - every other kind — nothing a board could show, so never.
 *
 * The single definition of the rule; both {@link followUpModesFor} and
 * {@link wouldOrphanKeyedFollowUp} call through it.
 */
const hasScorableAnswerKey = (content: SlideContent): boolean => {
  switch (content.contentType) {
    case "TEXT":
      return content.acceptedAnswers.some((answer) => answer.trim() !== "");
    case "DRAWING":
      return (
        content.correctImage != null &&
        !content.correctImage.external &&
        !isImageEmpty(content.correctImage)
      );
    default:
      return false;
  }
};

/**
 * All follow-up modes valid for a parent with the given content. Takes the
 * full content, not just its `contentType`, because a keyed mode
 * ({@link FOLLOW_UP_MODES_REQUIRING_ANSWER_KEY}) needs one more fact than the
 * type table can express: the parent has to carry an authored answer to hide
 * ({@link hasScorableAnswerKey}) — a TEXT slide with no answer key, or a
 * Drawing slide with no correct-answer image, is a collect-only prompt with
 * nothing to mix in, so it stays `BEST_ANSWER_VOTE` only. This mirrors the
 * backend's `AddFollowUpRequest` validation (400 on an ineligible parent/mode
 * pair), so the UI never offers a mode the server would reject.
 */
const followUpModesFor = (parentContent: SlideContent): FollowUpMode[] =>
  (Object.keys(FOLLOW_UP_MODE_PARENTS) as FollowUpMode[]).filter((mode) => {
    if (
      !(FOLLOW_UP_MODE_PARENTS[mode] as readonly SlideType[]).includes(
        parentContent.contentType,
      )
    ) {
      return false;
    }
    if (FOLLOW_UP_MODES_REQUIRING_ANSWER_KEY.has(mode)) {
      return hasScorableAnswerKey(parentContent);
    }
    return true;
  });

/** The slide's attached follow-up, if its `childId` names a valid one. */
const attachedFollowUpOf = (
  slide: SlideResponse,
  slides: SlideResponse[],
): SlideResponse | undefined => {
  if (!slide.childId) return undefined;
  const child = slides.find((s) => s.id === slide.childId);
  if (!child || child.parentId !== slide.id) return undefined;
  return child.content.contentType === "FOLLOW_UP" ? child : undefined;
};

/** The slide's linked parent, if its `parentId` names one whose back-pointer agrees. */
const linkedParentOf = (
  slides: SlideResponse[],
  followUpSlide: SlideResponse,
): SlideResponse | undefined => {
  if (!followUpSlide.parentId) return undefined;
  const parent = slides.find((s) => s.id === followUpSlide.parentId);
  return parent?.childId === followUpSlide.id ? parent : undefined;
};

/**
 * Whether the editor should offer "Add follow-up" on this slide: its content
 * type has at least one valid mode (which already excludes follow-ups and
 * non-scorable kinds) and it doesn't have an attached follow-up yet.
 */
const canHaveFollowUp = (
  slide: SlideResponse,
  slides: SlideResponse[],
): boolean =>
  followUpModesFor(slide.content).length > 0 &&
  attachedFollowUpOf(slide, slides) === undefined;

/**
 * Whether updating a slide's content to `nextContent` would strip the authored
 * answer out from under an attached follow-up that needs one — a TEXT parent
 * losing its last non-blank accepted answer, or a Drawing parent losing its
 * correct-answer image. The backend rejects exactly that content transition
 * with 400 (it would leave the follow-up's answer key dangling). The TEXT and
 * Drawing editors call this before persisting the removal so the block happens
 * client-side, before the doomed PUT ever fires through the slide-update path
 * (which discards its promise and can't surface the 400).
 *
 * Gated on {@link FOLLOW_UP_MODES_REQUIRING_ANSWER_KEY}, not on the
 * `SPOT_THE_ANSWER` name, because the server gates on `requiresAnswerKey()` —
 * a second keyed mode must orphan-check the same way from the day it exists.
 */
const wouldOrphanKeyedFollowUp = (
  slide: SlideResponse,
  slides: SlideResponse[],
  nextContent: SlideContent,
): boolean => {
  const attached = attachedFollowUpOf(slide, slides);
  if (!attached || attached.content.contentType !== "FOLLOW_UP") return false;
  return (
    FOLLOW_UP_MODES_REQUIRING_ANSWER_KEY.has(attached.content.mode) &&
    !hasScorableAnswerKey(nextContent)
  );
};

/** A rail/move unit: a slide plus its attached follow-up, if any. */
interface SlideUnit {
  head: SlideResponse;
  followUp?: SlideResponse;
}

/**
 * Group an ordered slide list into units: a parent and its valid attached
 * follow-up form one unit; every other slide is a unit of its own. The rail
 * renders units (so a pair drags as one block) and the optimistic move patch
 * splices them, keeping both consistent with the server's normalization.
 */
const groupIntoUnits = (slides: SlideResponse[]): SlideUnit[] => {
  const units: SlideUnit[] = [];
  const consumed = new Set<string>();
  for (const slide of slides) {
    const followUp = attachedFollowUpOf(slide, slides);
    if (followUp) consumed.add(followUp.id);
  }
  for (const slide of slides) {
    if (consumed.has(slide.id)) continue; // rendered inside its parent's unit
    units.push({ head: slide, followUp: attachedFollowUpOf(slide, slides) });
  }
  return units;
};

export {
  FOLLOW_UP_MODE_PARENTS,
  FOLLOW_UP_MODE_LABELS,
  FOLLOW_UP_MODES_REQUIRING_ANSWER_KEY,
  hasScorableAnswerKey,
  followUpModesFor,
  attachedFollowUpOf,
  linkedParentOf,
  canHaveFollowUp,
  wouldOrphanKeyedFollowUp,
  groupIntoUnits,
};
export type { SlideUnit };
