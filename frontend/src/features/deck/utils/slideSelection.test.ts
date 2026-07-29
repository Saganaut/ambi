// Guards the post-delete selection rule: the editor must never keep pointing at
// a slide it just removed, and it must land on the *previous* rail row (or on no
// slide at all) rather than on whatever happens to shift into the gap.
import { describe, expect, it } from "vitest";

import type { SlideResponse } from "@deck/store/deckApi.gen";
import { selectionAfterRemoval } from "./slideSelection";

const slide = (
  id: string,
  extra: Partial<SlideResponse> = {},
): SlideResponse => ({
  id,
  title: id,
  createdByUserId: "author",
  lastEditedByUserId: "author",
  content: {
    contentType: "MCQ",
    options: [],
    correctOptionIds: [],
    dataVisualization: "NONE",
  },
  ...extra,
});

/** A parent with a valid attached follow-up: both back-pointers agree. */
const withFollowUp = (
  parentId: string,
  followUpId: string,
): SlideResponse[] => [
  slide(parentId, { childId: followUpId }),
  slide(followUpId, {
    parentId,
    content: { contentType: "FOLLOW_UP", mode: "BEST_ANSWER_VOTE" },
  }),
];

const plain = ["a", "b", "c"].map((id) => slide(id));

describe("selectionAfterRemoval", () => {
  it("keeps the URL when nothing is selected", () => {
    expect(selectionAfterRemoval(plain, "b", undefined)).toEqual({
      action: "keep",
    });
  });

  it("keeps the URL when an unselected slide is removed", () => {
    expect(selectionAfterRemoval(plain, "c", "a")).toEqual({ action: "keep" });
  });

  it("keeps the URL when the removed slide isn't in the deck", () => {
    expect(selectionAfterRemoval(plain, "gone", "a")).toEqual({
      action: "keep",
    });
  });

  it("selects the previous slide when the selected slide is removed", () => {
    expect(selectionAfterRemoval(plain, "b", "b")).toEqual({
      action: "select",
      slideId: "a",
    });
    expect(selectionAfterRemoval(plain, "c", "c")).toEqual({
      action: "select",
      slideId: "b",
    });
  });

  it("clears the selection when the first slide is removed", () => {
    // Later slides survive, but the card is explicit: no previous slide means
    // no `slideId` in the URL at all.
    expect(selectionAfterRemoval(plain, "a", "a")).toEqual({ action: "clear" });
  });

  it("clears the selection when the only slide is removed", () => {
    expect(selectionAfterRemoval([slide("solo")], "solo", "solo")).toEqual({
      action: "clear",
    });
  });

  it("selects the parent when its selected follow-up is removed", () => {
    const slides = [slide("a"), ...withFollowUp("b", "b-fu")];
    expect(selectionAfterRemoval(slides, "b-fu", "b-fu")).toEqual({
      action: "select",
      slideId: "b",
    });
  });

  it("moves off a follow-up cascaded away with its parent", () => {
    // Deleting the parent takes the follow-up with it, so the selection has to
    // skip past both and land on the row above the parent.
    const slides = [slide("a"), ...withFollowUp("b", "b-fu"), slide("c")];
    expect(selectionAfterRemoval(slides, "b", "b-fu")).toEqual({
      action: "select",
      slideId: "a",
    });
    expect(selectionAfterRemoval(slides, "b", "b")).toEqual({
      action: "select",
      slideId: "a",
    });
  });

  it("clears when the first unit's parent takes the selected follow-up with it", () => {
    const slides = [...withFollowUp("a", "a-fu"), slide("b")];
    expect(selectionAfterRemoval(slides, "a", "a-fu")).toEqual({
      action: "clear",
    });
  });

  it("selects the follow-up above the removed slide", () => {
    const slides = [...withFollowUp("a", "a-fu"), slide("b")];
    expect(selectionAfterRemoval(slides, "b", "b")).toEqual({
      action: "select",
      slideId: "a-fu",
    });
  });

  it("ignores a dangling child link when computing the cascade", () => {
    // `childId` points at a slide that doesn't point back, so it is not an
    // attached follow-up and survives the parent's removal.
    const slides = [slide("a"), slide("b", { childId: "c" }), slide("c")];
    expect(selectionAfterRemoval(slides, "b", "c")).toEqual({ action: "keep" });
  });
});
