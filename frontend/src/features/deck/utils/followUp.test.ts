// The frontend half of the follow-up pairing rule, which the editor offers
// modes and blocks answer-key edits from. Two things are worth pinning here:
//
//  - `followUpModesFor` must never offer a mode the API would 400. The type
//    table alone doesn't settle that — `SPOT_THE_ANSWER` also needs the parent
//    to carry an authored answer, which is a different fact per parent kind (a
//    non-blank accepted answer on TEXT, a stored `correctImage` on DRAWING).
//  - `wouldOrphanKeyedFollowUp` is the client-side guard standing in for a 400
//    the fire-and-forget slide PUT could never surface, so it has to agree with
//    that same rule on the *next* content, on both parent kinds.
//
// Plus basic cover for the pure link helpers every rail/move path derives from.
import { describe, expect, it } from "vitest";

import type { AppImage, SlideContent, SlideResponse } from "@deck/store/deckApi.gen";
import {
  attachedFollowUpOf,
  canHaveFollowUp,
  followUpModesFor,
  groupIntoUnits,
  wouldOrphanKeyedFollowUp,
} from "./followUp";

// ── fixtures ────────────────────────────────────────────────────────────────

const textContent = (acceptedAnswers: string[]): SlideContent => ({
  contentType: "TEXT",
  acceptedAnswers,
  matchMode: "EXACT",
  caseSensitive: false,
  trimWhitespace: true,
});

/** A stored (gallery) image with a renderable variant — what a board can show. */
const storedImage = (srcKey: string): AppImage => ({
  external: false,
  srcKey,
  variants: { LG: `https://cdn/${srcKey}` },
});

const drawingContent = (correctImage?: AppImage): SlideContent => ({
  contentType: "DRAWING",
  promptPlacement: "ALONGSIDE",
  correctImage,
  palette: [],
  tools: ["PEN"],
});

const mcqContent = (): SlideContent => ({
  contentType: "MCQ",
  options: [],
  correctOptionIds: [],
  dataVisualization: "NONE",
});

const slide = (
  id: string,
  content: SlideContent,
  extra: Partial<SlideResponse> = {},
): SlideResponse => ({
  id,
  title: id,
  createdByUserId: "author",
  lastEditedByUserId: "author",
  content,
  ...extra,
});

/** A parent and its attached follow-up on `mode`, both back-pointers agreeing. */
const pair = (
  parentContent: SlideContent,
  mode: "BEST_ANSWER_VOTE" | "PREDICT_POPULAR" | "SPOT_THE_ANSWER",
): SlideResponse[] => [
  slide("p", parentContent, { childId: "f" }),
  slide("f", { contentType: "FOLLOW_UP", mode }, { parentId: "p" }),
];

// ── followUpModesFor ────────────────────────────────────────────────────────

describe("followUpModesFor", () => {
  it("offers both keyed and unkeyed modes on a TEXT parent with an answer key", () => {
    expect(followUpModesFor(textContent(["Paris"]))).toEqual([
      "BEST_ANSWER_VOTE",
      "SPOT_THE_ANSWER",
    ]);
  });

  it("withholds SPOT_THE_ANSWER from a TEXT parent with no answer key", () => {
    expect(followUpModesFor(textContent([]))).toEqual(["BEST_ANSWER_VOTE"]);
  });

  it("withholds SPOT_THE_ANSWER from a TEXT parent whose answers are all blank", () => {
    // Counts trimmed entries, not list length — the backend would 400 this.
    expect(followUpModesFor(textContent(["   ", ""]))).toEqual(["BEST_ANSWER_VOTE"]);
  });

  it("offers SPOT_THE_ANSWER on a DRAWING parent carrying an answer image", () => {
    expect(followUpModesFor(drawingContent(storedImage("gallery/answer.png")))).toEqual([
      "BEST_ANSWER_VOTE",
      "SPOT_THE_ANSWER",
    ]);
  });

  it("withholds SPOT_THE_ANSWER from a DRAWING parent with no answer image", () => {
    expect(followUpModesFor(drawingContent())).toEqual(["BEST_ANSWER_VOTE"]);
  });

  it("withholds SPOT_THE_ANSWER when the answer image is external", () => {
    // An external image owns no stored object the board could serve opaquely
    // beside the submitted drawings, so the backend rejects it as a key.
    expect(
      followUpModesFor(
        drawingContent({ external: true, externalSrc: "https://elsewhere/a.png", variants: {} }),
      ),
    ).toEqual(["BEST_ANSWER_VOTE"]);
  });

  it("withholds SPOT_THE_ANSWER when the answer image carries no variant", () => {
    expect(
      followUpModesFor(drawingContent({ external: false, srcKey: "gallery/a.png", variants: {} })),
    ).toEqual(["BEST_ANSWER_VOTE"]);
  });

  it("offers the MCQ pair and never a keyed mode on an MCQ parent", () => {
    expect(followUpModesFor(mcqContent())).toEqual(["BEST_ANSWER_VOTE", "PREDICT_POPULAR"]);
  });

  it("offers nothing on a non-scorable parent", () => {
    expect(followUpModesFor({ contentType: "TITLE", subtitle: "x" })).toEqual([]);
  });
});

// ── wouldOrphanKeyedFollowUp ────────────────────────────────────────────────

describe("wouldOrphanKeyedFollowUp", () => {
  it("blocks stripping a TEXT parent's last non-blank answer under a keyed child", () => {
    const slides = pair(textContent(["Paris"]), "SPOT_THE_ANSWER");

    expect(wouldOrphanKeyedFollowUp(slides[0], slides, textContent([]))).toBe(true);
    expect(wouldOrphanKeyedFollowUp(slides[0], slides, textContent(["  "]))).toBe(true);
  });

  it("allows a TEXT answer-key edit that keeps one non-blank answer", () => {
    const slides = pair(textContent(["Paris", "Paree"]), "SPOT_THE_ANSWER");

    expect(wouldOrphanKeyedFollowUp(slides[0], slides, textContent(["Paree"]))).toBe(false);
  });

  it("blocks clearing a DRAWING parent's answer image under a keyed child", () => {
    const slides = pair(drawingContent(storedImage("gallery/answer.png")), "SPOT_THE_ANSWER");

    expect(wouldOrphanKeyedFollowUp(slides[0], slides, drawingContent())).toBe(true);
  });

  it("allows replacing a DRAWING parent's answer image", () => {
    const slides = pair(drawingContent(storedImage("gallery/answer.png")), "SPOT_THE_ANSWER");

    expect(
      wouldOrphanKeyedFollowUp(slides[0], slides, drawingContent(storedImage("gallery/new.png"))),
    ).toBe(false);
  });

  it("allows the same edits under an unkeyed child", () => {
    const textSlides = pair(textContent(["Paris"]), "BEST_ANSWER_VOTE");
    const drawingSlides = pair(drawingContent(storedImage("gallery/a.png")), "BEST_ANSWER_VOTE");

    expect(wouldOrphanKeyedFollowUp(textSlides[0], textSlides, textContent([]))).toBe(false);
    expect(wouldOrphanKeyedFollowUp(drawingSlides[0], drawingSlides, drawingContent())).toBe(false);
  });

  it("allows the edit when no follow-up is attached at all", () => {
    const lone = [slide("p", textContent(["Paris"]))];

    expect(wouldOrphanKeyedFollowUp(lone[0], lone, textContent([]))).toBe(false);
  });

  it("ignores a half-written link whose back-pointer disagrees", () => {
    // Same degradation the backend applies: a dangling childId is not a link.
    const slides = [
      slide("p", textContent(["Paris"]), { childId: "f" }),
      slide("f", { contentType: "FOLLOW_UP", mode: "SPOT_THE_ANSWER" }),
    ];

    expect(wouldOrphanKeyedFollowUp(slides[0], slides, textContent([]))).toBe(false);
  });
});

// ── the link helpers ────────────────────────────────────────────────────────

describe("attachedFollowUpOf", () => {
  it("resolves a follow-up whose back-pointers agree", () => {
    const slides = pair(textContent(["Paris"]), "SPOT_THE_ANSWER");

    expect(attachedFollowUpOf(slides[0], slides)?.id).toBe("f");
  });

  it("rejects a dangling childId, a disagreeing parentId, and a non-follow-up child", () => {
    const dangling = [slide("p", mcqContent(), { childId: "gone" })];
    const disagreeing = [
      slide("p", mcqContent(), { childId: "f" }),
      slide("f", { contentType: "FOLLOW_UP", mode: "BEST_ANSWER_VOTE" }, { parentId: "other" }),
    ];
    const notAFollowUp = [
      slide("p", mcqContent(), { childId: "f" }),
      slide("f", mcqContent(), { parentId: "p" }),
    ];

    expect(attachedFollowUpOf(dangling[0], dangling)).toBeUndefined();
    expect(attachedFollowUpOf(disagreeing[0], disagreeing)).toBeUndefined();
    expect(attachedFollowUpOf(notAFollowUp[0], notAFollowUp)).toBeUndefined();
  });
});

describe("canHaveFollowUp", () => {
  it("offers the affordance on a scorable slide with no follow-up yet", () => {
    const slides = [slide("p", mcqContent())];

    expect(canHaveFollowUp(slides[0], slides)).toBe(true);
  });

  it("withholds it once one is attached, and on a kind no mode accepts", () => {
    const attached = pair(mcqContent(), "PREDICT_POPULAR");
    const title = [slide("t", { contentType: "TITLE", subtitle: "x" })];

    expect(canHaveFollowUp(attached[0], attached)).toBe(false);
    expect(canHaveFollowUp(title[0], title)).toBe(false);
  });

  it("withholds it on the follow-up itself — no chains", () => {
    const slides = pair(mcqContent(), "PREDICT_POPULAR");

    expect(canHaveFollowUp(slides[1], slides)).toBe(false);
  });
});

describe("groupIntoUnits", () => {
  it("folds an attached follow-up into its parent's unit and leaves the rest alone", () => {
    const slides = [
      slide("a", mcqContent()),
      ...pair(mcqContent(), "PREDICT_POPULAR"),
      slide("z", mcqContent()),
    ];

    const units = groupIntoUnits(slides);

    expect(units.map((unit) => unit.head.id)).toEqual(["a", "p", "z"]);
    expect(units[1].followUp?.id).toBe("f");
    expect(units[0].followUp).toBeUndefined();
  });

  it("keeps a half-written pair as two plain units", () => {
    const slides = [
      slide("p", mcqContent(), { childId: "f" }),
      slide("f", { contentType: "FOLLOW_UP", mode: "BEST_ANSWER_VOTE" }),
    ];

    expect(groupIntoUnits(slides).map((unit) => unit.head.id)).toEqual(["p", "f"]);
  });
});
