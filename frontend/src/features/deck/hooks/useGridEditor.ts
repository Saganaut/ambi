// Grid-specific editing layer for the deck editor's Grid slide.
//
// Sits on the generic `useSlideEditor<"GRID">` and exposes the intent-level
// surface the Grid author UI consumes: a synthesized `question` view, a prompt
// edit, row/column label ops, and per-item ops keyed by item id. There is
// exactly ONE `useSlideEditor` instance per Grid slide (this hook is
// instantiated once, in `GridSlideContent`), so every write funnels through a
// single draft + debounce buffer.
//
// A GRID slide is a drag-into-matrix: labeled rows × columns, a bank of items,
// and `correctCells` mapping each item id to its target `"rowIndex,colIndex"`
// cell. Structural edits keep that map consistent: removing an item drops its
// target; removing a row/column drops targets in it and reindexes the ones
// behind it. Grading is EXACT (all placements must match), so `scoreMode` has
// no authoring knob — `buildDefaultContent` fixes it and the editor never
// writes it.
import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";

import type { GridItem } from "@deck/store/deckApi.gen";

import { buildDefaultGridItem } from "../utils/slideContent";
import { useSlideEditor } from "./useSlideEditor";

/** A matrix needs at least one row and one column … */
const MIN_GRID_DIMENSION = 1;
/** … and is capped so the play-time matrix stays legible on one screen. */
const MAX_GRID_DIMENSION = 6;
/** At least one item to place … */
const MIN_GRID_ITEMS = 1;
/** … and few enough that the item bank stays scannable. */
const MAX_GRID_ITEMS = 12;

/** Which matrix axis an op addresses. */
type GridAxis = "row" | "col";

/** The backend cell-id shape: {@code "rowIndex,colIndex"}. */
const cellId = (row: number, col: number): string => `${row.toString()},${col.toString()}`;

/** Parse a {@code "rowIndex,colIndex"} cell id (defensive: NaNs never match). */
const parseCell = (cell: string): { row: number; col: number } => {
  const [row, col] = cell.split(",").map(Number);
  return { row, col };
};

/** Flattened, UI-facing view of the active Grid slide. */
interface GridQuestionView {
  id: string;
  /** The prompt text — stored in `slide.title`, not in the content. */
  prompt: string;
  rowLabels: string[];
  colLabels: string[];
  items: GridItem[];
  /** Target cell per item id ({@code "rowIndex,colIndex"}). */
  correctCells: Record<string, string>;
}

interface UseGridEditorResult {
  /** The active Grid slide as a flat view, or undefined until one is selected. */
  question: GridQuestionView | undefined;

  /** ── Question-level ──────────────────────────────────────────────────── */
  /** Debounced prompt edit → persisted to `slide.title`. */
  schedulePrompt: (html: string) => void;
  /** Flush any pending debounced edit immediately (bind to blur). */
  flush: () => void;

  /** ── Matrix axes ─────────────────────────────────────────────────────── */
  canAddLabel: (axis: GridAxis) => boolean;
  canRemoveLabel: (axis: GridAxis) => boolean;
  /** Append a blank label to the axis (no-op at the cap). */
  addLabel: (axis: GridAxis) => void;
  /** Remove the label at `index`, dropping/reindexing item targets in that lane. */
  removeLabel: (axis: GridAxis, index: number) => void;
  /** Debounced label text edit. */
  scheduleLabel: (axis: GridAxis, index: number, label: string) => void;

  /** ── Items (keyed by `item.id`) ──────────────────────────────────────── */
  canAddItem: boolean;
  canRemoveItem: boolean;
  addItem: () => void;
  /** Remove the item and its target-cell assignment. */
  removeItem: (itemId: string | undefined) => void;
  /** Debounced item label edit. */
  scheduleItemLabel: (itemId: string | undefined, label: string) => void;
  /** @dnd-kit drop handler for the item list (bank display order only). */
  handleItemDragEnd: (event: DragEndEvent) => void;
  /** Assign (cell id) or clear (null) the item's target cell. Immediate. */
  setTargetCell: (itemId: string | undefined, cell: string | null) => void;
}

/**
 * Drop targets in the removed lane and shift the ones behind it down one, so
 * `correctCells` stays aligned with the shrunken label list.
 */
const remapAfterRemoval = (
  correctCells: Record<string, string>,
  axis: GridAxis,
  removed: number,
): Record<string, string> => {
  const next: Record<string, string> = {};
  for (const [itemId, cell] of Object.entries(correctCells)) {
    const { row, col } = parseCell(cell);
    const lane = axis === "row" ? row : col;
    if (lane === removed) continue;
    const shifted = lane > removed ? lane - 1 : lane;
    next[itemId] = axis === "row" ? cellId(shifted, col) : cellId(row, shifted);
  }
  return next;
};

const useGridEditor = (deckId: string, slideId: string): UseGridEditorResult => {
  const editor = useSlideEditor(deckId, slideId, "GRID");

  const slide = editor.slide;
  const content = slide?.content;
  const items = content?.items ?? [];

  const labelsOf = (axis: GridAxis): string[] =>
    (axis === "row" ? content?.rowLabels : content?.colLabels) ?? [];
  const labelPatch = (axis: GridAxis, labels: string[]) =>
    axis === "row" ? { rowLabels: labels } : { colLabels: labels };

  const question: GridQuestionView | undefined = slide
    ? {
        id: slide.id,
        prompt: slide.title,
        rowLabels: content?.rowLabels ?? [],
        colLabels: content?.colLabels ?? [],
        items,
        correctCells: content?.correctCells ?? {},
      }
    : undefined;

  const schedulePrompt = (html: string) => editor.updateMetadata({ title: html });

  const canAddLabel = (axis: GridAxis) => labelsOf(axis).length < MAX_GRID_DIMENSION;
  const canRemoveLabel = (axis: GridAxis) => labelsOf(axis).length > MIN_GRID_DIMENSION;

  const addLabel = (axis: GridAxis) => {
    if (!canAddLabel(axis)) return;
    editor.updateSlideContent((prev) =>
      labelPatch(axis, [...(axis === "row" ? prev.rowLabels : prev.colLabels), ""]),
    );
    editor.flush();
  };

  const removeLabel = (axis: GridAxis, index: number) => {
    if (!canRemoveLabel(axis)) return;
    editor.updateSlideContent((prev) => {
      const labels = (axis === "row" ? prev.rowLabels : prev.colLabels).filter(
        (_, i) => i !== index,
      );
      return {
        ...labelPatch(axis, labels),
        correctCells: remapAfterRemoval(prev.correctCells, axis, index),
      };
    });
    editor.flush();
  };

  const scheduleLabel = (axis: GridAxis, index: number, label: string) => {
    editor.updateSlideContent((prev) => {
      const labels = (axis === "row" ? prev.rowLabels : prev.colLabels).slice();
      labels[index] = label;
      return labelPatch(axis, labels);
    });
  };

  const canAddItem = items.length < MAX_GRID_ITEMS;
  const canRemoveItem = items.length > MIN_GRID_ITEMS;

  const addItem = () => {
    if (!canAddItem) return;
    editor.updateSlideContent((prev) => ({ items: [...prev.items, buildDefaultGridItem()] }));
    editor.flush();
  };

  const removeItem = (itemId: string | undefined) => {
    if (!itemId || !canRemoveItem) return;
    editor.updateSlideContent((prev) => {
      const { [itemId]: _dropped, ...rest } = prev.correctCells;
      return { items: prev.items.filter((item) => item.id !== itemId), correctCells: rest };
    });
    editor.flush();
  };

  const scheduleItemLabel = (itemId: string | undefined, label: string) => {
    if (!itemId) return;
    editor.updateSlideContent((prev) => ({
      items: prev.items.map((item) => (item.id === itemId ? { ...item, label } : item)),
    }));
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
      return { items: next };
    });
    editor.flush();
  };

  const setTargetCell = (itemId: string | undefined, cell: string | null) => {
    if (!itemId) return;
    editor.updateSlideContent((prev) => {
      if (cell == null) {
        const { [itemId]: _dropped, ...rest } = prev.correctCells;
        return { correctCells: rest };
      }
      return { correctCells: { ...prev.correctCells, [itemId]: cell } };
    });
    editor.flush();
  };

  return {
    question,
    schedulePrompt,
    flush: editor.flush,
    canAddLabel,
    canRemoveLabel,
    addLabel,
    removeLabel,
    scheduleLabel,
    canAddItem,
    canRemoveItem,
    addItem,
    removeItem,
    scheduleItemLabel,
    handleItemDragEnd,
    setTargetCell,
  };
};

export {
  MAX_GRID_DIMENSION,
  MAX_GRID_ITEMS,
  MIN_GRID_DIMENSION,
  MIN_GRID_ITEMS,
  cellId,
  parseCell,
  useGridEditor,
};
export type { GridAxis, GridQuestionView, UseGridEditorResult };
