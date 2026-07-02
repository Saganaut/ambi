// Content-slide ("TITLE") editing layer for the deck editor.
//
// Sits on the generic `useSlideEditor<"TITLE">` and exposes the intent-level
// surface the block-stack author UI consumes: the ordered `blocks` plus
// add / remove / move / update-block ops. There is exactly ONE `useSlideEditor`
// instance per content slide (this hook is instantiated once, in
// `TitleSlideContent`), so every block edit funnels through a single draft +
// debounce buffer — that's what keeps concurrent block edits from stomping each
// other. Each `BlockCard` is a controlled component receiving its slice of this
// surface as props.
//
// Block edits use the functional `updateSlideContent((prev) => …)` form so
// back-to-back writes inside one debounce window build on each other rather than
// each starting from the same stale render snapshot.
import {
  createSlideBlock,
  type BlockUpdateMode,
  type SlideBlockKind,
  type SlideBlockUnion,
} from "../components/DeckEditor/SlideContent/SlideContent/Block.types";
import { useSlideEditor } from "./useSlideEditor";

interface UseTitleEditorResult {
  /** The active content slide's body blocks, in order (empty until loaded). */
  blocks: SlideBlockUnion[];
  /** True once a TITLE slide is loaded and editable. */
  ready: boolean;
  /** Append a fresh block of the given kind (immediate commit). */
  addBlock: (kind: SlideBlockKind) => void;
  /** Remove the block with the given id (immediate commit). */
  removeBlock: (id: string) => void;
  /** Move a block one slot up (-1) or down (+1); no-op at the ends. */
  moveBlock: (id: string, direction: -1 | 1) => void;
  /**
   * Replace one block in place. `"schedule"` debounces (typed-into fields);
   * `"commit"` flushes immediately (discrete picks, blur).
   */
  updateBlock: (next: SlideBlockUnion, mode: BlockUpdateMode) => void;
  /** Flush any pending debounced edit immediately (bind to blur). */
  flush: () => void;
}

const useTitleEditor = (
  deckId: string,
  slideId: string,
): UseTitleEditorResult => {
  const editor = useSlideEditor(deckId, slideId, "TITLE");
  const slide = editor.slide;
  const blocks = slide?.content.blocks ?? [];

  const addBlock = (kind: SlideBlockKind) => {
    editor.updateSlideContent((prev) => ({
      blocks: [...prev.blocks, createSlideBlock(kind)],
    }));
    editor.flush();
  };

  const removeBlock = (id: string) => {
    editor.updateSlideContent((prev) => ({
      blocks: prev.blocks.filter((block) => block.id !== id),
    }));
    editor.flush();
  };

  const moveBlock = (id: string, direction: -1 | 1) => {
    const idx = blocks.findIndex((block) => block.id === id);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= blocks.length) return;
    editor.updateSlideContent((prev) => {
      const next = prev.blocks.slice();
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return { blocks: next };
    });
    editor.flush();
  };

  const updateBlock = (next: SlideBlockUnion, mode: BlockUpdateMode) => {
    editor.updateSlideContent((prev) => ({
      blocks: prev.blocks.map((block) => (block.id === next.id ? next : block)),
    }));
    if (mode === "commit") editor.flush();
  };

  return {
    blocks,
    ready: slide != null,
    addBlock,
    removeBlock,
    moveBlock,
    updateBlock,
    flush: editor.flush,
  };
};

export { useTitleEditor };
export type { UseTitleEditorResult };
