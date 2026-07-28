// Ranking-specific editing layer for the deck editor's Ranking slide.
//
// Sits on the generic `useSlideEditor<"RANKING">` and exposes the intent-level
// surface the Ranking author UI consumes: a synthesized `question` view, a
// prompt edit, and per-item ops keyed by item id. There is exactly ONE
// `useSlideEditor` instance per Ranking slide (this hook is instantiated once,
// in `RankingSlideContent`), so every write — the prompt, each item's label,
// add / remove / reorder — funnels through a single draft + debounce buffer.
//
// The authoring order IS the correct order. RANKING content stores
// `correctOrder` (item ids, top → bottom) alongside `items`; at play time the
// items are shuffled and the player drags them back into order. So every
// structural edit — add, remove, drag-reorder — rebuilds `correctOrder` from
// the current item order to keep the two in lockstep. A label-only edit leaves
// the order untouched.
//
// Item identity — id AND color — is a stored fact, minted at creation and
// repaired on load for legacy content (`useItemIdentityBackfill`); the pill
// color is the item's own, so reordering the list renumbers it (which here IS
// the answer) without repainting it.
import type { AppImage, RankItem } from "@deck/store/deckApi.gen";
import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";

import { nextPaletteColor } from "@/shared/components/Charts/optionPalette";
import type { Identified } from "../components/DeckEditor/SlideContent/_shared/placement/placement.types";
import { buildDefaultRankItem } from "../utils/slideContent";
import { useItemIdentityBackfill } from "./useItemIdentityBackfill";
import { useSlideEditor } from "./useSlideEditor";

/** A ranking needs at least two items to be a real ordering … */
const MIN_RANKING_ITEMS = 2;
/** … and is capped at eight so the shuffled play-time list stays legible. */
const MAX_RANKING_ITEMS = 8;
/** `maxLength` for item label inputs (matches the other editors). */
const RANKING_LABEL_MAX = 80;

/** Flattened, UI-facing view of the active Ranking slide. */
interface RankingQuestionView {
  id: string;
  /** The prompt text — stored in `slide.title`, not in the content. */
  prompt: string;
  /** The list, every item carrying the id `correctOrder` records it by. */
  items: Identified<RankItem>[];
  /** Item ids in the correct order, top → bottom (mirrors `items` order). */
  correctOrder: string[];
}

interface UseRankingEditorResult {
  /** The active Ranking slide as a flat view, or undefined until one is selected. */
  question: RankingQuestionView | undefined;

  /** ── Question-level ──────────────────────────────────────────────────── */
  /** Debounced prompt edit → persisted to `slide.title`. */
  schedulePrompt: (html: string) => void;
  /** Flush any pending debounced edit immediately (bind to blur). */
  flush: () => void;
  /** True while under {@link MAX_RANKING_ITEMS}. */
  canAddItem: boolean;
  /** Append a blank item (no-op at the max). */
  addItem: () => void;
  /** @dnd-kit drop handler for the item list — reorders and rewrites `correctOrder`. */
  handleItemDragEnd: (event: DragEndEvent) => void;

  /** ── Per-item (keyed by `item.id`) ───────────────────────────────────── */
  /** True while above {@link MIN_RANKING_ITEMS} — same for every item. */
  canRemove: boolean;
  /** Debounced label edit. */
  scheduleItem: (itemId: string | undefined, next: RankItem) => void;
  /** Immediate label edit (e.g. clearing an image, once images ship). */
  commitItem: (itemId: string | undefined, next: RankItem) => void;
  /** Override the item's palette color (menu swatch / custom picker). Immediate. */
  setItemColor: (itemId: string | undefined, color: string) => void;
  /** Set or clear (empty AppImage) the item's image. Immediate. */
  setItemImage: (itemId: string | undefined, image: AppImage) => void;
  removeItem: (itemId: string | undefined) => void;
}

/** Item ids in list order, dropping any without an id (defensive: the load-time
 *  backfill mints one for every item, so nothing should be dropped here). */
const orderOf = (items: readonly RankItem[]): string[] =>
  items.map((item) => item.id).filter((id): id is string => id != null);

const useRankingEditor = (deckId: string, slideId: string): UseRankingEditorResult => {
  const editor = useSlideEditor(deckId, slideId, "RANKING");

  // `editor.slide` is already narrowed to the RANKING slide (its `content` is
  // the RANKING arm of the `SlideContent` union): passing `"RANKING"` makes the
  // hook runtime-guard on `content.contentType`, so a non-ranking slide reads
  // back as `undefined` rather than being asserted into the wrong type.
  const slide = editor.slide;
  const content = slide?.content;
  const items = content?.items ?? [];

  // Freeze legacy items' ids and colors into the content once, on load, and
  // rebuild `correctOrder` from the repaired list in the same write — an item
  // that had no id was silently missing from the order until now.
  useItemIdentityBackfill(slideId, content?.items, (backfilled) => {
    editor.updateSlideContent({ items: backfilled, correctOrder: orderOf(backfilled) });
    editor.flush();
  });

  const canAddItem = items.length < MAX_RANKING_ITEMS;
  const canRemove = items.length > MIN_RANKING_ITEMS;

  const question: RankingQuestionView | undefined = slide
    ? {
        id: slide.id,
        prompt: slide.title,
        // An id-less item is unaddressable and absent from `correctOrder`, so
        // it is withheld rather than rendered inert; the backfill above mints
        // its id on the very next render.
        items: items.filter((item): item is Identified<RankItem> => item.id != null),
        correctOrder: content?.correctOrder ?? [],
      }
    : undefined;

  const schedulePrompt = (html: string) => editor.updateMetadata({ title: html });

  const addItem = () => {
    if (!canAddItem) return;
    // The color is picked against the freshest draft, so two adds inside one
    // debounce window can't both claim the same palette slot.
    editor.updateSlideContent((prev) => {
      const next = [
        ...prev.items,
        buildDefaultRankItem(nextPaletteColor(prev.items.map((item) => item.color))),
      ];
      return { items: next, correctOrder: orderOf(next) };
    });
    editor.flush();
  };

  // Replace one item in place (label edit) deriving from the freshest pending
  // draft so sibling edits in the same debounce window aren't clobbered. Order
  // is unchanged, so `correctOrder` is intentionally left as-is.
  const setItem = (id: string, next: RankItem) =>
    editor.updateSlideContent((prev) => ({
      items: prev.items.map((item) => (item.id === id ? next : item)),
    }));

  const scheduleItem = (id: string | undefined, next: RankItem) => {
    if (!id) return;
    setItem(id, next);
  };

  const commitItem = (id: string | undefined, next: RankItem) => {
    if (!id) return;
    setItem(id, next);
    editor.flush();
  };

  // Merge a patch into one item and persist immediately (menu-driven edits).
  // Order is unchanged, so `correctOrder` is intentionally left as-is.
  const commitItemPatch = (id: string | undefined, patch: Partial<RankItem>) => {
    if (!id) return;
    editor.updateSlideContent((prev) => ({
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
    editor.flush();
  };

  const setItemColor = (id: string | undefined, color: string) => {
    commitItemPatch(id, { color });
  };

  const setItemImage = (id: string | undefined, image: AppImage) => {
    commitItemPatch(id, { image });
  };

  const removeItem = (id: string | undefined) => {
    if (!id || !canRemove) return;
    editor.updateSlideContent((prev) => {
      const next = prev.items.filter((item) => item.id !== id);
      return { items: next, correctOrder: orderOf(next) };
    });
    editor.flush();
  };

  const handleItemDragEnd = (event: DragEndEvent) => {
    if (event.canceled) return;
    const { source } = event.operation;
    if (!isSortable(source)) return;
    const { initialIndex, index } = source;
    if (initialIndex === index) return;
    editor.updateSlideContent((prev) => {
      const next = prev.items.slice();
      const [moved] = next.splice(initialIndex, 1);
      next.splice(index, 0, moved);
      return { items: next, correctOrder: orderOf(next) };
    });
    editor.flush();
  };

  return {
    question,
    schedulePrompt,
    flush: editor.flush,
    canAddItem,
    addItem,
    handleItemDragEnd,
    canRemove,
    scheduleItem,
    commitItem,
    setItemColor,
    setItemImage,
    removeItem,
  };
};

export { MAX_RANKING_ITEMS, MIN_RANKING_ITEMS, RANKING_LABEL_MAX, useRankingEditor };
export type { RankingQuestionView, UseRankingEditorResult };
