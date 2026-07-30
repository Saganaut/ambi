// Follow-up slide pairing rules, mirrored from the backend.
//
// A parent/follow-up link is real only when BOTH back-pointers agree
// (`parent.childId === child.id` and `child.parentId === parent.id`) and the
// child's content is FOLLOW_UP — the same attachment check `Deck` applies on
// the server, so dangling legacy links degrade to plain slides here too. This
// module is the single home for that rule: the rail's unit grouping, the
// optimistic move patch, and the add-follow-up affordances all derive from it.
import type { SlideResponse } from "@deck/store/deckApi.gen";
import type { FollowUpMode, SlideType } from "@deck/store/deckEnums.gen";

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
} as const satisfies Record<FollowUpMode, readonly SlideType[]>;

/** Author-facing label for each mode (canvas banner + inspector select). */
const FOLLOW_UP_MODE_LABELS = {
  BEST_ANSWER_VOTE: "Vote for the best answer",
  PREDICT_POPULAR: "Predict the most popular answer",
} as const satisfies Record<FollowUpMode, string>;

/** All follow-up modes valid for a parent of the given content type. */
const followUpModesFor = (parentType: SlideType): FollowUpMode[] =>
  (Object.keys(FOLLOW_UP_MODE_PARENTS) as FollowUpMode[]).filter((mode) =>
    (FOLLOW_UP_MODE_PARENTS[mode] as readonly SlideType[]).includes(parentType),
  );

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
  followUpModesFor(slide.content.contentType).length > 0 &&
  attachedFollowUpOf(slide, slides) === undefined;

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
  followUpModesFor,
  attachedFollowUpOf,
  linkedParentOf,
  canHaveFollowUp,
  groupIntoUnits,
};
export type { SlideUnit };
