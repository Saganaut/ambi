// Deck-*creation* layer between the generated deck API and the "New deck" button.
// Creation is the one deck operation that has no deckId to scope to, so it lives
// apart from `useDeck` (which requires a deckId and only mutates an existing deck).
// Cache behaviour for the underlying mutation lives in `store/enhancements/deck.ts`
// so it applies no matter who calls it.
import { useNavigate } from "@tanstack/react-router";
import { useCreateDeckMutation } from "@deck/store/deckApi.gen";

interface CreateDeckResult {
  /** The client-minted id of the new deck. */
  id: string;
  /**
   * Resolves when the deck has been persisted server-side. The caller chains any
   * follow-up that must run *after* the deck exists (e.g. adding the first slide)
   * off this, and owns error handling; rejects if the PUT fails.
   */
  persisted: Promise<unknown>;
}

interface UseCreateDeckResult {
  /**
   * Create a new (empty) deck. Mints the id client-side and PUTs it; the deck is
   * born named "Untitled Deck" server-side. Returns the id synchronously so the
   * caller can seed the cache and navigate straight to the editor, plus the
   * `persisted` promise so it can sequence follow-up writes after the deck exists.
   */
  createDeck: () => CreateDeckResult;
  createDeckAndGoToEditor: () => void;
}

const useCreateDeck = (): UseCreateDeckResult => {
  const navigate = useNavigate();
  const [createDeckMutation] = useCreateDeckMutation();

  const createDeck = (): CreateDeckResult => {
    const id = crypto.randomUUID();
    // Idempotent PUT that persists the id; the deck defaults to "Untitled Deck"
    // server-side. The caller navigates to the editor (where getDeck fetches it)
    // and handles any rejection of `persisted`.
    const persisted = createDeckMutation({ id }).unwrap();
    return { id, persisted };
  };

  //TODO: consider making this async that awaits the persisted deck Id for confirmation
  const createDeckAndGoToEditor = (): void => {
    const { id: deckId } = createDeck();

    void navigate({ to: `/decks/${deckId}/edit` });
  };

  return { createDeck, createDeckAndGoToEditor };
};

export { useCreateDeck };
export type { UseCreateDeckResult, CreateDeckResult };
