// Deck-*creation* layer between the generated deck API and the "New deck" button.
// Creation is the one deck operation that has no deckId to scope to, so it lives
// apart from `useDeckMutate` (which requires a deckId and only mutates an existing deck).
// Cache behaviour for the underlying mutation lives in `store/enhancements/deck.ts`
// so it applies no matter who calls it.
//
// De-duplication: several "New deck" affordances render at once (header button and
// grid tile), each mounting its own instance of this hook, so a burst of clicks must
// not mint a deck per click. Two layers keep it to one — a `fixedCacheKey` shared by
// every instance surfaces one `isCreating` flag for the UI to disable from, and a
// module-level pending create is handed back to any call that lands while a PUT is
// still in flight (covering clicks in the same tick, before `isCreating` re-renders).
import { useNavigate } from "@tanstack/react-router";
import { useCreateDeckMutation } from "@deck/store/deckApi.gen";

const CREATE_DECK_CACHE_KEY = "createDeck";

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
   *
   * While a create is still in flight this returns that create's result — the same
   * id and the same `persisted` promise — rather than starting a second one. Once
   * it settles (either way) the next call mints a fresh id, so a failed create
   * stays retryable.
   */
  createDeck: () => CreateDeckResult;
  /**
   * Create a deck and navigate to its editor. A no-op while a create is already in
   * flight, so repeated clicks on the "New deck" affordances yield one deck.
   */
  createDeckAndGoToEditor: () => void;
  /**
   * Whether a create is in flight, shared across every instance of this hook. The
   * "New deck" controls render their busy/disabled state from it.
   */
  isCreating: boolean;
}

let pendingCreate: CreateDeckResult | null = null;

const useCreateDeck = (): UseCreateDeckResult => {
  const navigate = useNavigate();
  const [createDeckMutation, { isLoading: isCreating }] = useCreateDeckMutation({
    fixedCacheKey: CREATE_DECK_CACHE_KEY,
  });

  const createDeck = (): CreateDeckResult => {
    if (pendingCreate) return pendingCreate;

    const id = crypto.randomUUID();
    const persisted = createDeckMutation({ id }).unwrap();
    const inFlight: CreateDeckResult = { id, persisted };
    pendingCreate = inFlight;

    void persisted
      .catch(() => undefined)
      .finally(() => {
        if (pendingCreate === inFlight) pendingCreate = null;
      });

    return inFlight;
  };

  //TODO: consider making this async that awaits the persisted deck Id for confirmation
  const createDeckAndGoToEditor = (): void => {
    if (isCreating || pendingCreate) return;

    const { id: deckId } = createDeck();

    void navigate({ to: `/decks/${deckId}/edit` });
  };

  return { createDeck, createDeckAndGoToEditor, isCreating };
};

export { useCreateDeck };
export type { UseCreateDeckResult, CreateDeckResult };
