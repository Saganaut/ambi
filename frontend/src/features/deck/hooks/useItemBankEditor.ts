import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";

import { nextPaletteColor } from "@/shared/components/Charts/optionPalette";
import type { AppImage } from "@deck/store/deckApi.gen";

import type { EditableItemContent } from "../components/DeckEditor/SlideContent/_shared/Item.types";
import { useItemIdentityBackfill } from "./useItemIdentityBackfill";

type BankItem = Partial<EditableItemContent>;

interface ItemBankContent<I extends BankItem = BankItem> {
  items: I[];
}

type ItemOf<C extends ItemBankContent> = C["items"][number];

interface ItemBankSlideEditor<C extends ItemBankContent> {
  slide: { content: C } | undefined;
  updateSlideContent: (patch: (prev: C) => Partial<C>) => void;
  flush: () => void;
}

type BankFields = Pick<BankItem, "label" | "color" | "image">;
interface UseItemBankEditorOptions<
  C extends ItemBankContent<I>,
  I extends BankItem = ItemOf<C>,
> {
  slideId: string;
  toPatch: (items: I[]) => Partial<C>;
  buildItem: (color: string) => NoInfer<I & { id: string }>;
  minItems: number;
  maxItems: number;
  onRemoveItem?: (prev: C, itemId: string) => Partial<C>;
}

interface UseItemBankEditorResult<
  C extends ItemBankContent<I>,
  I extends BankItem = ItemOf<C>,
> {
  items: (I & { id: string })[];
  canAdd: boolean;
  canRemove: boolean;
  addItem: (withNewItem?: (item: I & { id: string }, prev: C) => Partial<C>) => void;
  removeItem: (itemId: string | undefined) => void;
  scheduleItemLabel: (itemId: string | undefined, label: string) => void;
  setItemColor: (itemId: string | undefined, color: string) => void;
  setItemImage: (itemId: string | undefined, image: AppImage) => void;
  handleItemDragEnd: (event: DragEndEvent) => void;
}

const useItemBankEditor = <C extends ItemBankContent<I>, I extends BankItem = ItemOf<C>>(
  editor: ItemBankSlideEditor<C>,
  options: UseItemBankEditorOptions<C, I>,
): UseItemBankEditorResult<C, I> => {
  const { slideId, toPatch, buildItem, minItems, maxItems, onRemoveItem } = options;
  const bankItems: I[] = editor.slide?.content.items ?? [];

  useItemIdentityBackfill(slideId, editor.slide?.content.items, (backfilled) => {
    editor.updateSlideContent(() => toPatch(backfilled));
    editor.flush();
  });

  const commit = (patch: (prev: C) => Partial<C>) => {
    editor.updateSlideContent(patch);
    editor.flush();
  };

  const items = bankItems.filter((item): item is I & { id: string } => item.id != null);
  const canAdd = bankItems.length < maxItems;
  const canRemove = bankItems.length > minItems;

  const addItem = (withNewItem?: (item: I & { id: string }, prev: C) => Partial<C>) => {
    if (!canAdd) return;
    commit((prev) => {
      const item = buildItem(nextPaletteColor(prev.items.map((each) => each.color)));
      const bankPatch = toPatch([...prev.items, item]);
      const extra = withNewItem?.(item, prev);
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
