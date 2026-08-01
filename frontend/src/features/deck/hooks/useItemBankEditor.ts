// Shared editing engine for the item bank the placement-family slide kinds
// (Axis, Grid, Ranking, Scales, Place-on-Image) all carry: an ordered list of
// identity-bearing rows (id, label, color, image) with bounded add/remove,
// drag-reorder, per-row annotation edits, and the load-time identity backfill.
//
// Not a view-model: it is imported only by the per-kind editor hooks beside it
// in `features/deck/hooks/`, never by a component — and it mounts no
// `useSlideEditor` of its own. There is exactly ONE `useSlideEditor` instance
// per slide; the kind hook passes that instance in, because a second one would
// open a second draft + debounce buffer and edits would clobber each other.
//
// `toPatch` lifts a fresh bank into a patch of the kind's content, for two
// reasons. It is the type seam: `C` is generic in here, so only the caller —
// where `C` is concrete — can produce a `Partial<C>`, which keeps this hook
// free of the `as` cast conventions.md forbids. And it is the single funnel
// for every structural write (add, remove, reorder, backfill), so a kind that
// derives state from item order — Ranking's `correctOrder` — folds the rebuild
// into `toPatch` once and can never fall out of lockstep.
//
// A new row's color is minted against the freshest pending draft, not the
// render snapshot, so two adds inside one debounce window can't claim the
// same palette slot.
import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";

import { nextPaletteColor } from "@/shared/components/Charts/optionPalette";
import type { AppImage } from "@deck/store/deckApi.gen";

import type {
  Identified,
  PlaceableItem,
} from "../components/DeckEditor/SlideContent/_shared/placement/placement.types";
import { useItemIdentityBackfill } from "./useItemIdentityBackfill";

/**
 * The slice of a slide content an item bank owns: a list of identity-bearing
 * rows. Structural rather than a union of the wire arms (`AxisContent`,
 * `GridContent`, …) for the reason `placement.types` gives — every bank kind
 * already satisfies it, so the hook stays decoupled from all of them.
 */
interface ItemBankContent<I extends PlaceableItem = PlaceableItem> {
  items: I[];
}

/** The row type of a bank content `C` (`AxisItem` for `AxisContent`, …). */
type ItemOf<C extends ItemBankContent> = C["items"][number];

/**
 * The slice of `useSlideEditor`'s surface a bank needs. `UseSlideEditorResult`
 * for any bank kind satisfies it structurally, so the kind hook passes its own
 * editor straight through — the bank never mounts a second one.
 */
interface ItemBankSlideEditor<C extends ItemBankContent> {
  slide: { content: C } | undefined;
  updateSlideContent: (patch: (prev: C) => Partial<C>) => void;
  flush: () => void;
}

/** The row fields the bank itself writes — kind-specific row fields are the
 *  kind hook's business, so the item-patch surface is deliberately this narrow. */
type BankFields = Pick<PlaceableItem, "label" | "color" | "image">;

interface UseItemBankEditorOptions<
  C extends ItemBankContent<I>,
  I extends PlaceableItem = ItemOf<C>,
> {
  /** The slide being edited — the identity backfill's latch key. */
  slideId: string;
  /**
   * Lift a fresh bank into a patch of the kind's content. Almost always
   * `(items) => ({ items })`; Ranking folds its `correctOrder` mirror in here.
   * Also the type seam that keeps this hook cast-free (see header).
   */
  toPatch: (items: I[]) => Partial<C>;
  /** Mint a blank row in `color`. The id must be present: `addItem` keys the
   *  new row's answer-key entry by it in the very updater that appends it.
   *  `NoInfer` pins `I` to the content's own row type at the call site. */
  buildItem: (color: string) => NoInfer<Identified<I>>;
  /** Fewest rows the kind allows — `canRemove` is false at the floor. */
  minItems: number;
  /** Most rows the kind allows — `canAdd` is false at the cap. */
  maxItems: number;
  /** The kind's answer-key cleanup for a removed row, merged into the same
   *  write (Axis/Place drop `correctPositions[id]`, Grid `correctCells[id]`,
   *  Scales `correctValues[id]`; Ranking needs none — `toPatch` covers it). */
  onRemoveItem?: (prev: C, itemId: string) => Partial<C>;
}

interface UseItemBankEditorResult<
  C extends ItemBankContent<I>,
  I extends PlaceableItem = ItemOf<C>,
> {
  /** The bank, id-less rows withheld (the backfill mints their ids on the very
   *  next render). Each kind's `question.items` is exactly this. */
  items: Identified<I>[];
  /** True while under `maxItems`. */
  canAdd: boolean;
  /** True while above `minItems` — same for every row. */
  canRemove: boolean;
  /**
   * Append a row in the next free palette color, minted against the freshest
   * pending draft. `withNewItem` folds the kind's born-placed answer entry into
   * the same write (Grid's `addItem(cell)`, Place-on-Image's `addTarget(point)`).
   */
  addItem: (withNewItem?: (item: Identified<I>, prev: C) => Partial<C>) => void;
  /** Remove the row and, via `onRemoveItem`, whatever it keyed. No-op at the floor. */
  removeItem: (itemId: string | undefined) => void;
  /** Debounced label edit. */
  scheduleItemLabel: (itemId: string | undefined, label: string) => void;
  /** Override the row's palette color (menu swatch / custom picker). Immediate. */
  setItemColor: (itemId: string | undefined, color: string) => void;
  /** Set or clear (empty `AppImage`) the row's image. Immediate. */
  setItemImage: (itemId: string | undefined, image: AppImage) => void;
  /** @dnd-kit drop handler for the bank — display order only. Immediate. */
  handleItemDragEnd: (event: DragEndEvent) => void;
}

const useItemBankEditor = <C extends ItemBankContent<I>, I extends PlaceableItem = ItemOf<C>>(
  editor: ItemBankSlideEditor<C>,
  options: UseItemBankEditorOptions<C, I>,
): UseItemBankEditorResult<C, I> => {
  const { slideId, toPatch, buildItem, minItems, maxItems, onRemoveItem } = options;
  const bankItems: I[] = editor.slide?.content.items ?? [];

  // One write, on load, freezing legacy rows' ids and colors into the content.
  // Routed through `toPatch` so a derived order (Ranking's `correctOrder`) is
  // repaired in the same write — an id-less row was silently missing from it.
  useItemIdentityBackfill(slideId, editor.slide?.content.items, (backfilled) => {
    editor.updateSlideContent(() => toPatch(backfilled));
    editor.flush();
  });

  const commit = (patch: (prev: C) => Partial<C>) => {
    editor.updateSlideContent(patch);
    editor.flush();
  };

  const items = bankItems.filter((item): item is Identified<I> => item.id != null);
  const canAdd = bankItems.length < maxItems;
  const canRemove = bankItems.length > minItems;

  const addItem = (withNewItem?: (item: Identified<I>, prev: C) => Partial<C>) => {
    if (!canAdd) return;
    commit((prev) => {
      const item = buildItem(nextPaletteColor(prev.items.map((each) => each.color)));
      const bankPatch = toPatch([...prev.items, item]);
      const extra = withNewItem?.(item, prev);
      // Object.assign, not spread: its `{} & A & B` return type stays
      // assignable to `Partial<C>` where a fresh literal would not be.
      return extra == null ? bankPatch : Object.assign({}, bankPatch, extra);
    });
  };

  const removeItem = (itemId: string | undefined) => {
    if (!itemId || !canRemove) return;
    commit((prev) => {
      const bankPatch = toPatch(prev.items.filter((item) => item.id !== itemId));
      const extra = onRemoveItem?.(prev, itemId);
      return extra == null ? bankPatch : Object.assign({}, bankPatch, extra);
    });
  };

  // Display order only: every answer key is id-keyed and each row owns its
  // color, so a reorder renumbers the bank without moving or repainting anything.
  const handleItemDragEnd = (event: DragEndEvent) => {
    if (event.canceled) return;
    const { source } = event.operation;
    if (!isSortable(source)) return;
    const { initialIndex, index } = source;
    if (initialIndex === index) return;
    commit((prev) => {
      const next = prev.items.slice();
      const [moved] = next.splice(initialIndex, 1);
      next.splice(index, 0, moved);
      return toPatch(next);
    });
  };

  // Merge bank-owned fields into one row, deriving from the freshest pending
  // draft so sibling edits in the same debounce window aren't clobbered.
  const patchItemFields = (itemId: string, fields: BankFields) => {
    editor.updateSlideContent((prev) =>
      toPatch(prev.items.map((item) => (item.id === itemId ? { ...item, ...fields } : item))),
    );
  };

  const scheduleItemLabel = (itemId: string | undefined, label: string) => {
    if (!itemId) return;
    patchItemFields(itemId, { label });
  };

  const setItemColor = (itemId: string | undefined, color: string) => {
    if (!itemId) return;
    patchItemFields(itemId, { color });
    editor.flush();
  };

  const setItemImage = (itemId: string | undefined, image: AppImage) => {
    if (!itemId) return;
    patchItemFields(itemId, { image });
    editor.flush();
  };

  return {
    items,
    canAdd,
    canRemove,
    addItem,
    removeItem,
    scheduleItemLabel,
    setItemColor,
    setItemImage,
    handleItemDragEnd,
  };
};

export { useItemBankEditor };
export type {
  ItemBankContent,
  ItemBankSlideEditor,
  ItemOf,
  UseItemBankEditorOptions,
  UseItemBankEditorResult,
};
