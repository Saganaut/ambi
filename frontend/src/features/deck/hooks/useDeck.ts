// Deck layer between the generated deck API and the deck editor. Wraps the
// single-deck query plus every deck-lifecycle mutation behind intent-level
// handlers (rename, setVisibility, share, …), so the editor never touches RTK
// Query directly. The handlers are thin: they just fire the mutation. Cache
// behaviour (optimistic patch + tag-driven reconciling refetch) lives in
// `store/enhancements/deck.ts` so it applies no matter who calls the mutation.
// Always scoped to one existing deck — deck *creation* has no deckId to scope
// to and lives in `useCreateDeck`.

import { useLiveSession } from "@/features/liveSession/hooks/useLiveSession";
import { useConfirm } from "@components/ConfirmDialog/useConfirm";
import {
  DeckResponse,
  UpdateDeckRequest,
  ShareDeckRequest,
  useGetDeckQuery,
  useUpdateDeckMutation,
  useDeleteDeckMutation,
  useSetDeckVisibilityMutation,
  useShareDeckMutation,
  useRevokeShareDeckMutation,
  SetVisibilityRequest,
} from "@deck/store/deckApi.gen";
import { useNavigate } from "@tanstack/react-router";

interface UseDeckResult {
  deck: DeckResponse | undefined;
  isLoading: boolean;
  error: unknown;
  rename: (name: string) => void;
  /** Patch deck fields (PATCH, partial). */
  updateDeck: (patch: UpdateDeckRequest) => void;
  setVisibility: (visibility: SetVisibilityRequest["visibility"]) => void;
  share: (userId: string, role: ShareDeckRequest["role"]) => void;
  revokeShare: (userId: string) => void;
  /** Delete the deck; returns the mutation promise so callers can await it. */
  remove: () => Promise<unknown>;
  openDeckInEditor: () => void;
  openDeleteDeckModal: () => Promise<void>;
  present: () => void;
  addToCollection: () => void;
}

/**
 * @param deckId the existing deck to read + mutate. To create a deck, use
 *   `useCreateDeck` instead.
 */
const useDeck = (deckId: string): UseDeckResult => {
  const { data: deck, isLoading, error } = useGetDeckQuery({ id: deckId });
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [updateDeckMutation] = useUpdateDeckMutation();
  const [deleteDeckMutation] = useDeleteDeckMutation();
  const [setVisibilityMutation] = useSetDeckVisibilityMutation();
  const [shareMutation] = useShareDeckMutation();
  const [revokeShareMutation] = useRevokeShareDeckMutation();
  const { present: livePresent } = useLiveSession();

  const openDeckInEditor = () => {
    void navigate({
      to: "/decks/$deckId/edit",
      params: { deckId },
      search: { slideId: undefined },
    });
  };

  const addToCollection = () => {
    console.log("adding to collection not implemented yet");
  };

  const present = () => {
    // Placeholder until the live-session flow exists; logs "not yet implemented".
    livePresent(deckId);
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
      await deleteDeckMutation({ id: deckId }).unwrap();
    } catch (e) {
      console.error("Failed to delete deck", e);
    }
  };

  const updateDeck = (patch: UpdateDeckRequest) => {
    void updateDeckMutation({ id: deckId, updateDeckRequest: patch });
  };

  const rename = (name: string) => {
    updateDeck({ name });
  };

  const setVisibility = (visibility: SetVisibilityRequest["visibility"]) => {
    void setVisibilityMutation({
      id: deckId,
      setVisibilityRequest: { visibility },
    });
  };

  const share = (userId: string, role: ShareDeckRequest["role"]) => {
    void shareMutation({ id: deckId, userId, shareDeckRequest: { role } });
  };

  const revokeShare = (userId: string) => {
    void revokeShareMutation({ id: deckId, userId });
  };

  const remove = () => deleteDeckMutation({ id: deckId }).unwrap();

  return {
    deck,
    isLoading,
    error,
    rename,
    updateDeck,
    setVisibility,
    share,
    revokeShare,
    remove,
    openDeckInEditor,
    openDeleteDeckModal,
    present,
    addToCollection,
  };
};

export { useDeck };
export type { UseDeckResult };
