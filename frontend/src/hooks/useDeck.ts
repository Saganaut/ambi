// Deck layer between the generated deck API and the deck editor. Wraps the
// single-deck query plus every deck-lifecycle mutation behind intent-level
// handlers (rename, setVisibility, share, …), so the editor never touches RTK
// Query directly. The handlers are thin: they just fire the mutation. Cache
// behaviour (optimistic patch + tag-driven reconciling refetch) lives in
// `store/enhancements/deck.ts` so it applies no matter who calls the mutation.
// Deck *creation* is just a client-minted UUID PUT: the caller navigates to
// the editor, where getDeck fetches the now-existing deck.
import {
  useGetDeckQuery,
  useCreate1Mutation,
  useUpdateDeckMutation,
  useDeleteDeckMutation,
  useSetVisibilityMutation,
  useShareMutation,
  useRevokeShareMutation,
  type DeckResponse,
  type SetVisibilityRequest,
  type ShareDeckRequest,
  type UpdateDeckRequest,
} from "@/store/AmbiApi";

interface UseDeckResult {
  deck: DeckResponse | undefined;
  isLoading: boolean;
  error: unknown;
  /**
   * Create a new (empty) deck. Mints the id client-side and PUTs it; the deck
   * is born named "Untitled Deck" server-side. Returns the id so the caller can
   * navigate straight to the editor (where getDeck fetches it). Slides are
   * added separately.
   */
  createDeck: () => string;
  rename: (name: string) => void;
  /** Patch deck fields (PATCH, partial). */
  updateDeck: (patch: UpdateDeckRequest) => void;
  setVisibility: (visibility: SetVisibilityRequest["visibility"]) => void;
  share: (userId: string, role: ShareDeckRequest["role"]) => void;
  revokeShare: (userId: string) => void;
  /** Delete the deck; returns the mutation promise so callers can await it. */
  remove: () => Promise<unknown> | undefined;
}

/**
 * @param deckId the deck to read + mutate; omit when the hook is only used to
 *   create a deck (e.g. a "New deck" button), so the getDeck query stays idle.
 */
const useDeck = (deckId?: string): UseDeckResult => {
  const {
    data: deck,
    isLoading,
    error,
  } = useGetDeckQuery({ id: deckId ?? "" }, { skip: !deckId });

  const [createDeckMutation] = useCreate1Mutation();
  const [updateDeckMutation] = useUpdateDeckMutation();
  const [deleteDeckMutation] = useDeleteDeckMutation();
  const [setVisibilityMutation] = useSetVisibilityMutation();
  const [shareMutation] = useShareMutation();
  const [revokeShareMutation] = useRevokeShareMutation();

  const createDeck = (): string => {
    const newDeckId = crypto.randomUUID();
    // Idempotent PUT that persists the id; the deck defaults to "Untitled Deck"
    // server-side. The caller navigates to the editor, where getDeck fetches it.
    void createDeckMutation({ id: newDeckId })
      .unwrap()
      .catch((err: unknown) => {
        console.error("Failed to create deck", err);
      });
    return newDeckId;
  };

  const updateDeck = (patch: UpdateDeckRequest) => {
    if (!deckId) return;
    void updateDeckMutation({ id: deckId, updateDeckRequest: patch });
  };

  const rename = (name: string) => {
    updateDeck({ name });
  };

  const setVisibility = (visibility: SetVisibilityRequest["visibility"]) => {
    if (!deckId) return;
    void setVisibilityMutation({ id: deckId, setVisibilityRequest: { visibility } });
  };

  const share = (userId: string, role: ShareDeckRequest["role"]) => {
    if (!deckId) return;
    void shareMutation({ id: deckId, userId, shareDeckRequest: { role } });
  };

  const revokeShare = (userId: string) => {
    if (!deckId) return;
    void revokeShareMutation({ id: deckId, userId });
  };

  const remove = () => {
    if (!deckId) return undefined;
    return deleteDeckMutation({ id: deckId }).unwrap();
  };

  return {
    deck,
    isLoading,
    error,
    createDeck,
    rename,
    updateDeck,
    setVisibility,
    share,
    revokeShare,
    remove,
  };
};

export { useDeck };
export type { UseDeckResult };
