/**
 * The three pieces of purely local UI state a list-plus-placement composer
 * owns: the prompt mirror, which row is selected, and which row's menu is open.
 *
 * All three are per-slide, so they resync during render when the bound slide
 * changes ("derive state during render" — safe because the new value differs);
 * an effect would leave one frame of the previous slide's state on screen.
 * The prompt is mirrored locally so typing stays responsive while the editor's
 * debounced write is in flight.
 */
import { useState, type Dispatch, type SetStateAction } from "react";

/** The bound slide, as far as this hook cares. */
interface ComposerQuestion {
  id: string;
  prompt: string;
}

interface SlideComposerState {
  prompt: string;
  setPrompt: Dispatch<SetStateAction<string>>;
  /** The row armed for placement, if any. */
  selectedItemId: string | null;
  setSelectedItemId: Dispatch<SetStateAction<string | null>>;
  /** The row whose popover menu is open — at most one per slide. */
  openMenuId: string | null;
  setOpenMenuId: Dispatch<SetStateAction<string | null>>;
}

const useSlideComposerState = (question: ComposerQuestion | undefined): SlideComposerState => {
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [syncedFromId, setSyncedFromId] = useState(question?.id);
  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
    setSelectedItemId(null);
    setOpenMenuId(null);
  }

  return {
    prompt,
    setPrompt,
    selectedItemId,
    setSelectedItemId,
    openMenuId,
    setOpenMenuId,
  };
};

export { useSlideComposerState };
export type { ComposerQuestion, SlideComposerState };
