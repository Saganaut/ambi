// Pins the shared item-bank contract the per-kind slide editors compose:
// structural writes funnel through toPatch, colors mint against the freshest
// draft, and debounced vs immediate ops are told apart by their flushes.
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { DragDropManager } from "@dnd-kit/dom";
import { Sortable } from "@dnd-kit/dom/sortable";
import type { DragEndEvent } from "@dnd-kit/react";

import { paletteColorAt } from "@/shared/components/Charts/optionPalette";
import type { AppImage, AxisContent, AxisItem } from "../store/deckApi.gen";
import {
  useItemBankEditor,
  type ItemBankSlideEditor,
  type ItemBankContent,
  type UseItemBankEditorOptions,
} from "./useItemBankEditor";

interface TestItem {
  id?: string;
  label?: string;
  image?: AppImage;
  color?: string;
}

/** Purpose-built content: the structural bank plus an id-keyed answer key and
 *  an order derived from the bank — the Ranking-style lockstep invariant. */
interface TestContent {
  items: TestItem[];
  correctThings: Record<string, number>;
  order: string[];
}

const orderOf = (items: TestItem[]): string[] =>
  items.map((each) => each.id).filter((id): id is string => id != null);

const testContent = (overrides: Partial<TestContent> = {}): TestContent => ({
  items: [
    { id: "item_a", label: "Alpha", color: paletteColorAt(0) },
    { id: "item_b", label: "Beta", color: paletteColorAt(1) },
    { id: "item_c", label: "Gamma", color: paletteColorAt(2) },
  ],
  correctThings: { item_a: 1, item_b: 2 },
  order: ["item_a", "item_b", "item_c"],
  ...overrides,
});

/** A stand-in for the single `useSlideEditor` a slide owns: it applies each
 *  functional patch to the freshest pending draft the way the real buffer
 *  would, and records every flush so debounced and immediate ops can be told
 *  apart. */
const stubEditor = <C extends ItemBankContent>(initial: C) => {
  let committed = initial;
  let draft: C | null = null;
  const flushes: C[] = [];
  const editor: ItemBankSlideEditor<C> = {
    get slide() {
      return { content: committed };
    },
    updateSlideContent: (patch) => {
      const base = draft ?? committed;
      draft = { ...base, ...patch(base) };
    },
    flush: () => {
      if (draft == null) return;
      committed = draft;
      draft = null;
      flushes.push(committed);
    },
  };
  return { editor, flushes, latest: () => committed, draft: () => draft };
};

const renderBank = (
  initial: TestContent,
  overrides: Partial<UseItemBankEditorOptions<TestContent, TestItem>> = {},
) => {
  const stub = stubEditor(initial);
  let minted = 0;
  const options: UseItemBankEditorOptions<TestContent, TestItem> = {
    slideId: "slide-1",
    toPatch: (items) => ({ items, order: orderOf(items) }),
    buildItem: (color) => {
      minted += 1;
      return { id: `minted_${minted.toString()}`, label: "", color };
    },
    minItems: 1,
    maxItems: 6,
    ...overrides,
  };
  const rendered = renderHook(() => useItemBankEditor(stub.editor, options));
  return { ...stub, ...rendered };
};

// Real sortable instances, so the hook's real `isSortable` guard passes; the
// own-property `initialIndex` stands in for the index the drag started from,
// which dnd-kit only records during a live drag.
const manager = new DragDropManager();
let sortableCount = 0;
const sortableSource = (initialIndex: number, index: number) => {
  sortableCount += 1;
  const sortable = new Sortable({ id: `sortable_${sortableCount.toString()}`, index }, manager);
  Object.defineProperty(sortable.draggable, "initialIndex", { get: () => initialIndex });
  return sortable.draggable;
};

const dragEndEvent = (
  source: DragEndEvent["operation"]["source"],
  canceled = false,
): DragEndEvent => ({
  operation: {
    ...manager.dragOperation,
    activatorEvent: null,
    transform: { x: 0, y: 0 },
    shape: null,
    source,
    target: null,
    canceled,
  },
  canceled,
  suspend: () => ({ resume: () => undefined, abort: () => undefined }),
});

describe("useItemBankEditor", () => {
  it("mints a row in the lowest palette color its siblings have not claimed", () => {
    const { result, flushes, latest } = renderBank(
      testContent({
        items: [
          { id: "item_a", label: "Alpha", color: paletteColorAt(0) },
          { id: "item_c", label: "Gamma", color: paletteColorAt(2) },
        ],
        correctThings: { item_a: 1 },
        order: ["item_a", "item_c"],
      }),
    );

    act(() => {
      result.current.addItem();
    });

    expect(flushes).toHaveLength(1);
    const items = latest().items;
    expect(items).toHaveLength(3);
    expect(items[2]).toEqual({ id: "minted_1", label: "", color: paletteColorAt(1) });
  });

  it("mints against the freshest draft, so two adds inside one debounce window claim different colors", () => {
    const { result, flushes, latest } = renderBank(
      testContent({
        items: [{ id: "item_a", label: "Alpha", color: paletteColorAt(0) }],
        correctThings: {},
        order: ["item_a"],
      }),
    );

    act(() => {
      result.current.scheduleItemLabel("item_a", "Renamed");
    });
    expect(flushes).toHaveLength(0);

    act(() => {
      result.current.addItem();
      result.current.addItem();
    });

    expect(flushes).toHaveLength(2);
    const final = latest();
    // Each add derived from the freshest state, so the colors are distinct …
    expect(final.items.map((each) => each.color)).toEqual([
      paletteColorAt(0),
      paletteColorAt(1),
      paletteColorAt(2),
    ]);
    // … and the pending label edit rode into the first structural write.
    expect(final.items[0].label).toBe("Renamed");
  });

  it("refuses to add at the cap and to remove at the floor", () => {
    const seed = testContent({
      items: [
        { id: "item_a", label: "Alpha", color: paletteColorAt(0) },
        { id: "item_b", label: "Beta", color: paletteColorAt(1) },
      ],
      order: ["item_a", "item_b"],
    });
    const { result, flushes, latest } = renderBank(seed, { minItems: 2, maxItems: 2 });

    expect(result.current.canAdd).toBe(false);
    expect(result.current.canRemove).toBe(false);

    act(() => {
      result.current.addItem();
      result.current.removeItem("item_a");
    });

    expect(flushes).toHaveLength(0);
    expect(latest()).toEqual(seed);
  });

  it("folds the caller's answer-key entry into the very write that appends the row", () => {
    // Bound to the real AXIS wire type, proving the generic binds to a kind.
    const axisContent: AxisContent = {
      contentType: "AXIS",
      xLowLabel: "",
      xHighLabel: "",
      yLowLabel: "",
      yHighLabel: "",
      items: [{ id: "axis_a", label: "Existing", color: paletteColorAt(0) }],
      correctPositions: { axis_a: { x: 0.2, y: 0.4 } },
      tolerance: 0.1,
      scoreMode: "INSIDE_RADIUS",
    };
    const { editor, flushes, latest } = stubEditor(axisContent);
    const { result } = renderHook(() =>
      useItemBankEditor(editor, {
        slideId: "slide-axis",
        toPatch: (items) => ({ items }),
        buildItem: (color): AxisItem & { id: string } => ({ id: "axis_minted", label: "", color }),
        minItems: 1,
        maxItems: 6,
      }),
    );
    const withNewItem = vi.fn((item: AxisItem & { id: string }, prev: AxisContent) => ({
      correctPositions: { ...prev.correctPositions, [item.id]: { x: 0.5, y: 0.5 } },
    }));

    act(() => {
      result.current.addItem(withNewItem);
    });

    expect(withNewItem).toHaveBeenCalledTimes(1);
    expect(flushes).toHaveLength(1);
    const final = latest();
    expect(final.items).toHaveLength(2);
    expect(final.items[1]).toEqual({ id: "axis_minted", label: "", color: paletteColorAt(1) });
    // The same write appended the row and keyed its answer entry.
    expect(final.correctPositions).toEqual({
      axis_a: { x: 0.2, y: 0.4 },
      axis_minted: { x: 0.5, y: 0.5 },
    });
  });

  it("takes the removed row's answer-key entry with it", () => {
    const onRemoveItem = vi.fn((prev: TestContent, itemId: string) => {
      const { [itemId]: _dropped, ...rest } = prev.correctThings;
      return { correctThings: rest };
    });
    const { result, flushes, latest } = renderBank(testContent(), { onRemoveItem });

    act(() => {
      result.current.removeItem("item_a");
    });

    expect(onRemoveItem).toHaveBeenCalledTimes(1);
    expect(flushes).toHaveLength(1);
    const final = latest();
    expect(final.items.map((each) => each.id)).toEqual(["item_b", "item_c"]);
    expect(final.correctThings).toEqual({ item_b: 2 });
  });

  it("ignores an op addressed to an absent or undefined id", () => {
    const seed = testContent();
    const image: AppImage = { external: true, externalSrc: "https://example.test/pic.png" };
    const { result, flushes, latest, draft } = renderBank(seed);

    act(() => {
      result.current.removeItem(undefined);
      result.current.scheduleItemLabel(undefined, "Nope");
      result.current.setItemColor(undefined, "#ff8800");
      result.current.setItemImage(undefined, image);
    });
    // An undefined id writes nothing at all — not even a pending draft.
    expect(draft()).toBeNull();
    expect(flushes).toHaveLength(0);

    act(() => {
      result.current.setItemColor("ghost", "#ff8800");
      result.current.scheduleItemLabel("ghost", "Nope");
      result.current.removeItem("ghost");
    });
    // A stale id is inert: nothing changed, nothing was dropped.
    expect(latest().items).toEqual(seed.items);
    expect(latest().correctThings).toEqual(seed.correctThings);
    expect(latest().order).toEqual(seed.order);
  });

  it("debounces a label edit and flushes a color or image edit", () => {
    const image: AppImage = { external: true, externalSrc: "https://example.test/pic.png" };
    const { result, flushes, latest, draft } = renderBank(testContent());

    act(() => {
      result.current.scheduleItemLabel("item_a", "Renamed");
    });
    expect(flushes).toHaveLength(0);
    expect(draft()?.items[0].label).toBe("Renamed");
    expect(latest().items[0].label).toBe("Alpha");

    act(() => {
      result.current.setItemColor("item_b", "#ff8800");
    });
    expect(flushes).toHaveLength(1);
    // The immediate color edit carried the pending label edit with it.
    expect(latest().items[0].label).toBe("Renamed");
    expect(latest().items[1].color).toBe("#ff8800");

    act(() => {
      result.current.setItemImage("item_a", image);
    });
    expect(flushes).toHaveLength(2);
    expect(latest().items[0].image).toEqual(image);
    expect(latest().items[1].image).toBeUndefined();
  });

  it("reorders the bank on a drop, ignoring a canceled, non-sortable or same-index drag", () => {
    const { result, flushes, latest } = renderBank(testContent());

    act(() => {
      result.current.handleItemDragEnd(dragEndEvent(sortableSource(0, 2)));
    });
    expect(flushes).toHaveLength(1);
    expect(latest().items.map((each) => each.id)).toEqual(["item_b", "item_c", "item_a"]);

    act(() => {
      result.current.handleItemDragEnd(dragEndEvent(sortableSource(2, 0), true));
      result.current.handleItemDragEnd(dragEndEvent(null));
      result.current.handleItemDragEnd(dragEndEvent(sortableSource(1, 1)));
    });
    expect(flushes).toHaveLength(1);
    expect(latest().items.map((each) => each.id)).toEqual(["item_b", "item_c", "item_a"]);
  });

  it("routes every structural write through toPatch, so a derived order stays in lockstep", () => {
    const { result, latest } = renderBank(testContent());
    const expectLockstep = () => {
      expect(latest().order).toEqual(latest().items.map((each) => each.id));
    };

    act(() => {
      result.current.addItem();
    });
    expectLockstep();

    act(() => {
      result.current.removeItem("item_a");
    });
    expectLockstep();

    act(() => {
      result.current.handleItemDragEnd(dragEndEvent(sortableSource(0, 2)));
    });
    expect(latest().items.map((each) => each.id)).toEqual(["item_c", "minted_1", "item_b"]);
    expectLockstep();
  });

  it("repairs a legacy row's id and color once, through toPatch", () => {
    const { flushes, latest, rerender } = renderBank(
      testContent({
        items: [{ label: "Old" }, { id: "item_b", color: paletteColorAt(1) }],
        correctThings: { item_b: 2 },
        order: ["item_b"],
      }),
    );

    // Opening the slide wrote the repair once, ids and colors together.
    expect(flushes).toHaveLength(1);
    const repaired = latest();
    const mintedId = repaired.items[0].id ?? "";
    expect(mintedId).toBeTruthy();
    expect(mintedId).not.toBe("item_b");
    expect(repaired.items[0]).toEqual({ id: mintedId, label: "Old", color: paletteColorAt(0) });
    expect(repaired.items[1]).toEqual({ id: "item_b", color: paletteColorAt(1) });
    // The write went through toPatch: the derived order now sees the row that
    // was silently missing from it.
    expect(repaired.order).toEqual([mintedId, "item_b"]);

    rerender();
    expect(flushes).toHaveLength(1);
  });

  it("withholds an id-less row from the exposed bank", () => {
    const { result, rerender } = renderBank(
      testContent({
        items: [{ label: "NoId" }, { id: "item_b", color: paletteColorAt(1) }],
        correctThings: { item_b: 2 },
        order: ["item_b"],
      }),
    );

    // First render: the id-less row is unaddressable, so it is withheld.
    expect(result.current.items.map((each) => each.id)).toEqual(["item_b"]);

    // The backfill minted its id, so the very next render exposes it.
    rerender();
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[1].id).toBe("item_b");
    expect(result.current.items[0].id).toBeTruthy();
  });
});
