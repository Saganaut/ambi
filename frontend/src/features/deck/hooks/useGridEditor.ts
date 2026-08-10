import type { GridItem } from "@deck/store/deckApi.gen";

import type {
  ItemId,
  QuestionActions,
  QuestionState,
} from "../components/DeckEditor/SlideContent/_shared/Item.types";
import { buildDefaultGridItem } from "../utils/slideContent";
import { useItemBankEditor } from "./useItemBankEditor";
import { useSlideEditor } from "./useSlideEditor";

const MIN_GRID_DIMENSION = 1;
const MAX_GRID_DIMENSION = 6;
const MIN_GRID_ITEMS = 1;
const MAX_GRID_ITEMS = 12;

/** Which matrix axis an op addresses. */
type GridAxis = "row" | "col";

/** The backend cell-id shape: {@code "rowIndex,colIndex"}. */
type CellId = string;

/** A bank item carrying the id its target cell is keyed by. */
type GridBankItem = GridItem & { id: string };

/** Build the cell id of the cell at `row` × `col`. */
const cellId = (row: number, col: number): CellId => `${row.toString()},${col.toString()}`;

/** Parse a {@code "rowIndex,colIndex"} cell id (defensive: NaNs never match). */
const parseCell = (cell: CellId): { row: number; col: number } => {
  const [row, col] = cell.split(",").map(Number);
  return { row, col };
};

/** Flattened, UI-facing view of the active Grid slide. */
interface GridQuestionView {
  id: string;
  prompt: string;
  rowLabels: string[];
  colLabels: string[];
  items: GridBankItem[];
  correctCells: Record<ItemId, CellId>;
}

interface UseGridEditorResult {
  /** The active Grid slide as a flat view, or undefined until one is selected. */
  question: GridQuestionView | undefined;
  state: QuestionState<"GRID">;
  actions: QuestionActions<"GRID">;
}

/**
 * Drop targets in the removed lane and shift the ones behind it down one, so
 * `correctCells` stays aligned with the shrunken label list.
 */
const remapAfterRemoval = (
  correctCells: Record<ItemId, CellId>,
  axis: GridAxis,
  removed: number,
): Record<ItemId, CellId> => {
  const next: Record<ItemId, CellId> = {};
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

  const bank = useItemBankEditor(editor, {
    slideId,
    toPatch: (items) => ({ items }),
    buildItem: buildDefaultGridItem,
    minItems: MIN_GRID_ITEMS,
    maxItems: MAX_GRID_ITEMS,
    onRemoveItem: (prev, itemId) => {
      const { [itemId]: _dropped, ...rest } = prev.correctCells;
      return { correctCells: rest };
    },
  });

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
        items: bank.items,
        correctCells: content?.correctCells ?? {},
      }
    : undefined;

  const scheduleQuestionPrompt = (html: string) => editor.updateMetadata({ title: html });

  const canAddGridLabel = (axis: GridAxis) => labelsOf(axis).length < MAX_GRID_DIMENSION;
  const canRemoveGridLabel = (axis: GridAxis) => labelsOf(axis).length > MIN_GRID_DIMENSION;

  const addGridLabel = (axis: GridAxis) => {
    if (!canAddGridLabel(axis)) return;
    editor.updateSlideContent((prev) =>
      labelPatch(axis, [...(axis === "row" ? prev.rowLabels : prev.colLabels), ""]),
    );
    editor.flush();
  };

  const removeGridLabel = (axis: GridAxis, index: number) => {
    if (!canRemoveGridLabel(axis)) return;
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

  const scheduleGridLabel = (axis: GridAxis, index: number, label: string) => {
    editor.updateSlideContent((prev) => {
      const labels = (axis === "row" ? prev.rowLabels : prev.colLabels).slice();
      labels[index] = label;
      return labelPatch(axis, labels);
    });
  };

  /**
   * The target lands in the very write that appends the item, so the two can
   * never disagree.
   */
  const addItemAtCell = (cell: CellId) => {
    bank.addItem((item, prev) => ({ correctCells: { ...prev.correctCells, [item.id]: cell } }));
  };

  const scheduleCorrectAnswer = (itemId: ItemId | undefined, cell: CellId) => {
    if (!itemId) return;
    editor.updateSlideContent((prev) => ({
      correctCells: { ...prev.correctCells, [itemId]: cell },
    }));
  };

  const commitCorrectAnswer = (itemId: ItemId | undefined, cell: CellId) => {
    if (!itemId) return;
    scheduleCorrectAnswer(itemId, cell);
    editor.flush();
  };

  const clearCorrectAnswer = (itemId: ItemId | undefined) => {
    if (!itemId) return;
    editor.updateSlideContent((prev) => {
      const { [itemId]: _dropped, ...rest } = prev.correctCells;
      return { correctCells: rest };
    });
    editor.flush();
  };

  const getIsScorable = (itemId: ItemId) => content?.correctCells[itemId] != null;

  /**
   * A grid has no centre cell to seed, so an unplaced item can only be cleared,
   * never given a target here — the author surface arms it and names the cell.
   */
  const toggleScorability = (itemId: ItemId) => {
    if (!getIsScorable(itemId)) return;
    clearCorrectAnswer(itemId);
  };

  const state: QuestionState<"GRID"> = {
    canAddItem: bank.canAdd,
    canRemoveItem: bank.canRemove,
    displayResultsAsPercentage:
      slide?.settings?.answerSettings?.displayResultsAsPercentage ?? false,
    canAddGridLabel,
    canRemoveGridLabel,
  };

  const actions: QuestionActions<"GRID"> = {
    flush: editor.flush,
    scheduleQuestionPrompt,
    addGridLabel,
    removeGridLabel,
    scheduleGridLabel,
    addItemAtCell,
    addItem: () => {
      bank.addItem();
    },
    removeItem: bank.removeItem,
    scheduleItemLabel: bank.scheduleItemLabel,
    setItemColor: bank.setItemColor,
    setItemImage: bank.setItemImage,
    handleItemDragEnd: bank.handleItemDragEnd,
    scheduleCorrectAnswer,
    commitCorrectAnswer,
    clearCorrectAnswer,
    getIsScorable,
    toggleScorability,
  };

  return { question, state, actions };
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
export type { CellId, GridAxis, GridBankItem, GridQuestionView, UseGridEditorResult };
