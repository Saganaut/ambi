// Matching-specific editing layer for the deck editor's Matching slide.
//
// Sits on the generic `useSlideEditor<"MATCHING">` and exposes the
// intent-level surface the Matching author UI consumes: a synthesized
// `question` view, a prompt edit, structural pair ops, and per-card ops keyed
// by card id + side. There is exactly ONE `useSlideEditor` instance per
// Matching slide (this hook is instantiated once, in `MatchingSlideContent`),
// so every write funnels through a single draft + debounce buffer.
//
// A MATCHING slide stores two parallel item lists (`left` / `right`) whose
// shared index is the authored pairing: `left[i] ↔ right[i]` is pair `i`. The
// answer key (`correctPairs`, left id → right id) is all-or-nothing here:
// either empty (unscored, collect-only) or the exact mirror of the authored
// pairing — the Scorable toggle flips between the two, and structural edits
// (add/remove pair) keep a non-empty key in lockstep. Grading is EXACT (the
// whole mapping must match), so `scoreMode` has no authoring knob;
// `setScorable(true)` re-asserts EXACT so legacy content grades correctly.
import type { AppImage, MatchItem } from "@deck/store/deckApi.gen";

import { buildDefaultMatchItem } from "../utils/slideContent";
import { useSlideEditor } from "./useSlideEditor";

/** At least two pairs (one is not a matching challenge) … */
const MIN_MATCHING_PAIRS = 2;
/** … and few enough that the pair grid stays legible (MCQ-option parity). */
const MAX_MATCHING_PAIRS = 6;
/** `maxLength` for card phrase inputs. */
const MATCHING_LABEL_MAX = 80;

/** Which column of the pair a card op addresses. */
type MatchSide = "left" | "right";

/** One authored pair: the two cards sharing an index in `left` / `right`. */
interface MatchingPairView {
  left: MatchItem;
  right: MatchItem;
}
// TODO: this needs to be re-worked as here we always set pairs
// but it could be there is no set right answer
/** Flattened, UI-facing view of the active Matching slide. */
interface MatchingQuestionView {
  id: string;
  /** The prompt text — stored in `slide.title`, not in the content. */
  prompt: string;
  pairs: MatchingPairView[];
  /** True when `correctPairs` is populated — correct matches award points. */
  scorable: boolean;
}

interface UseMatchingEditorResult {
  /** The active Matching slide as a flat view, or undefined until one is selected. */
  question: MatchingQuestionView | undefined;

  /** ── Question-level ──────────────────────────────────────────────────── */
  /** Debounced prompt edit → persisted to `slide.title`. */
  schedulePrompt: (html: string) => void;
  /** Flush any pending debounced edit immediately (bind to blur). */
  flush: () => void;

  /** ── Pairs (keyed by the pair's LEFT card id) ────────────────────────── */
  canAddPair: boolean;
  canRemovePair: boolean;
  addPair: () => void;
  /** Remove the whole pair (both cards) and its answer-key entry. */
  removePair: (leftId: string | undefined) => void;

  /** ── Cards (keyed by side + card id) ─────────────────────────────────── */
  /** Debounced card phrase edit. */
  scheduleCardLabel: (side: MatchSide, cardId: string | undefined, label: string) => void;
  /** Override the card's palette color (menu swatch / custom picker). Immediate. */
  setCardColor: (side: MatchSide, cardId: string | undefined, color: string) => void;
  /** Set or clear (empty AppImage) the card's image. Immediate. */
  setCardImage: (side: MatchSide, cardId: string | undefined, image: AppImage) => void;

  /** ── Scoring ─────────────────────────────────────────────────────────── */
  /** Mirror the authored pairing into `correctPairs` (on) or clear it (off). Immediate. */
  setScorable: (scorable: boolean) => void;
}

/** Zip the parallel columns into pairs (defensive: extra tail items are hidden). */
const zipPairs = (left: MatchItem[], right: MatchItem[]): MatchingPairView[] =>
  Array.from({ length: Math.min(left.length, right.length) }, (_, i) => ({
    left: left[i],
    right: right[i],
  }));

/** The all-pairs answer key: left id → right id for every authored pair. */
const identityPairs = (left: MatchItem[], right: MatchItem[]): Record<string, string> =>
  Object.fromEntries(
    zipPairs(left, right)
      .filter((pair) => pair.left.id && pair.right.id)
      .map((pair) => [pair.left.id, pair.right.id] as [string, string]),
  );

const useMatchingEditor = (deckId: string, slideId: string): UseMatchingEditorResult => {
  const editor = useSlideEditor(deckId, slideId, "MATCHING");

  const slide = editor.slide;
  const content = slide?.content;
  const pairs = zipPairs(content?.left ?? [], content?.right ?? []);

  const question: MatchingQuestionView | undefined = slide
    ? {
        id: slide.id,
        prompt: slide.title,
        pairs,
        scorable: Object.keys(content?.correctPairs ?? {}).length > 0,
      }
    : undefined;

  const schedulePrompt = (html: string) => editor.updateMetadata({ title: html });

  const canAddPair = pairs.length < MAX_MATCHING_PAIRS;
  const canRemovePair = pairs.length > MIN_MATCHING_PAIRS;

  /** True when the freshest pending content is scored (key populated). */
  const isScored = (correctPairs: Record<string, string>) =>
    Object.keys(correctPairs).length > 0;

  const addPair = () => {
    if (!canAddPair) return;
    editor.updateSlideContent((prev) => {
      const left = [...prev.left, buildDefaultMatchItem()];
      const right = [...prev.right, buildDefaultMatchItem()];
      return {
        left,
        right,
        // A scored slide's key mirrors the authored pairing, so a new pair
        // joins the answer key immediately.
        correctPairs: isScored(prev.correctPairs) ? identityPairs(left, right) : prev.correctPairs,
      };
    });
    editor.flush();
  };

  const removePair = (leftId: string | undefined) => {
    if (!leftId || !canRemovePair) return;
    editor.updateSlideContent((prev) => {
      const index = prev.left.findIndex((card) => card.id === leftId);
      if (index < 0) return {};
      const left = prev.left.filter((_, i) => i !== index);
      const right = prev.right.filter((_, i) => i !== index);
      return {
        left,
        right,
        correctPairs: isScored(prev.correctPairs) ? identityPairs(left, right) : prev.correctPairs,
      };
    });
    editor.flush();
  };

  /** Merge a patch into one card, leaving the rest of its column untouched. */
  const patchCard = (side: MatchSide, cardId: string | undefined, patch: Partial<MatchItem>) => {
    if (!cardId) return;
    editor.updateSlideContent((prev) => ({
      [side]: prev[side].map((card) => (card.id === cardId ? { ...card, ...patch } : card)),
    }));
  };

  const scheduleCardLabel = (side: MatchSide, cardId: string | undefined, label: string) => {
    patchCard(side, cardId, { label });
  };

  const setCardColor = (side: MatchSide, cardId: string | undefined, color: string) => {
    patchCard(side, cardId, { color });
    editor.flush();
  };

  const setCardImage = (side: MatchSide, cardId: string | undefined, image: AppImage) => {
    patchCard(side, cardId, { image });
    editor.flush();
  };

  const setScorable = (scorable: boolean) => {
    editor.updateSlideContent((prev) =>
      scorable
        ? // Re-assert EXACT alongside the key: it is the only graded mode, and
          // pre-redesign content may carry a stale PARTIAL that never grades.
          { correctPairs: identityPairs(prev.left, prev.right), scoreMode: "EXACT" }
        : { correctPairs: {} },
    );
    editor.flush();
  };

  return {
    question,
    schedulePrompt,
    flush: editor.flush,
    canAddPair,
    canRemovePair,
    addPair,
    removePair,
    scheduleCardLabel,
    setCardColor,
    setCardImage,
    setScorable,
  };
};

export { MATCHING_LABEL_MAX, MAX_MATCHING_PAIRS, MIN_MATCHING_PAIRS, useMatchingEditor };
export type { MatchingPairView, MatchingQuestionView, MatchSide, UseMatchingEditorResult };

