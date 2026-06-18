// View-model for deck-level user actions triggered from menus / cards (e.g. the
// My Decks card menu). Composes the deck write boundary (`useDeckMutate`) with
// the UI concerns a write boundary must NOT own — confirm dialogs, navigation,
// and the live-session flow. This is the view-model layer in the hook-roles
// taxonomy: see z-docs/rules/frontend/hook-roles.md.

import { useLiveSession } from "@/features/liveSession/hooks/useLiveSession";
import { useConfirm } from "@components/ConfirmDialog/useConfirm";
import { useNavigate } from "@tanstack/react-router";
import { useDeckMutate } from "./useDeckMutate";

interface UseDeckActionsResult {
  /** Navigate to the deck editor. */
  openDeckInEditor: () => void;
  /** Confirm, then delete the deck. */
  openDeleteDeckModal: () => Promise<void>;
  /** Start presenting the deck (live session). */
  present: () => void;
  addToCollection: () => void;
}

const useDeckActions = (deckId: string): UseDeckActionsResult => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { remove } = useDeckMutate(deckId);
  const { present: livePresent } = useLiveSession();

  const openDeckInEditor = () => {
    void navigate({
      to: "/decks/$deckId/edit",
      params: { deckId },
      search: { slideId: undefined },
    });
  };

  const present = () => {
    // Placeholder until the live-session flow exists; logs "not yet implemented".
    livePresent(deckId);
  };

  const addToCollection = () => {
    console.log("adding to collection not implemented yet");
  };

  const openDeleteDeckModal = async () => {
    const ok = await confirm({
      title: "Delete deck",
      message: "Delete this deck and all its questions?",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await remove();
    } catch (e) {
      console.error("Failed to delete deck", e);
    }
  };

  return { openDeckInEditor, openDeleteDeckModal, present, addToCollection };
};

export { useDeckActions };
export type { UseDeckActionsResult };
