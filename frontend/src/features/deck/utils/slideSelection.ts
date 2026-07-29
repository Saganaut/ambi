// Where the editor's selection lands after a slide is removed.
//
// Deleting a slide must never leave the route pointing at a slide that no
// longer exists, so the editor re-aims `slideId` at the *previous* rail entry —
// or drops it from the URL entirely when the removed slide was the first one.
// The decision is pure (slides in, verdict out) so it can be reasoned about and
// tested without a router or an RTK Query cache; `useDeckEditor` owns the
// navigation that acts on it.
import type { SlideResponse } from "@deck/store/deckApi.gen";
import { attachedFollowUpOf, groupIntoUnits } from "./followUp";

/** What should happen to the route's `slideId` after a removal. */
type SelectionAfterRemoval =
  /** The removal doesn't touch the selection — leave the URL alone. */
  | { action: "keep" }
  /** Select this slide (the one before the removed slide in the rail). */
  | { action: "select"; slideId: string }
  /** Nothing precedes the removed slide — drop `slideId` from the URL. */
  | { action: "clear" };

/**
 * The slides in the order the left rail paints them: each unit's head followed
 * by its attached follow-up. The cached order already matches, but deriving it
 * from {@link groupIntoUnits} keeps "previous slide" meaning "the row above" no
 * matter how the collection is stored.
 */
const railOrder = (slides: SlideResponse[]): SlideResponse[] =>
  groupIntoUnits(slides).flatMap((unit) =>
    unit.followUp ? [unit.head, unit.followUp] : [unit.head],
  );

/**
 * Every slide that disappears when `removedSlideId` is deleted — the slide
 * itself plus, for a parent, its attached follow-up (the server cascade,
 * mirrored by the optimistic patch in `store/enhancements/slide.ts`).
 */
const cascadeOf = (
  removed: SlideResponse,
  slides: SlideResponse[],
): Set<string> => {
  const followUp = attachedFollowUpOf(removed, slides);
  return new Set(followUp ? [removed.id, followUp.id] : [removed.id]);
};

/**
 * Decide the editor's selection after `removedSlideId` is deleted.
 *
 * Only a removal that takes the selected slide with it moves the selection —
 * deleting some other slide leaves the URL untouched. When it does, the
 * selection steps back to the rail row above the removed slide; with nothing
 * above it, the selection is cleared even if later slides remain.
 *
 * The row above is always a survivor: a unit's follow-up is emitted directly
 * after its own head, so the only cascade member that can precede the removed
 * slide is a follow-up whose parent is the removed slide — and that follow-up
 * is emitted *after* it, never before.
 */
const selectionAfterRemoval = (
  slides: SlideResponse[],
  removedSlideId: string,
  selectedSlideId: string | undefined,
): SelectionAfterRemoval => {
  if (selectedSlideId === undefined) return { action: "keep" };
  const removed = slides.find((slide) => slide.id === removedSlideId);
  if (!removed) return { action: "keep" };

  const cascade = cascadeOf(removed, slides);
  if (!cascade.has(selectedSlideId)) return { action: "keep" };

  const order = railOrder(slides);
  const removedIndex = order.findIndex((slide) => slide.id === removedSlideId);
  const previous = order[removedIndex - 1];
  return previous
    ? { action: "select", slideId: previous.id }
    : { action: "clear" };
};

export { selectionAfterRemoval };
export type { SelectionAfterRemoval };
