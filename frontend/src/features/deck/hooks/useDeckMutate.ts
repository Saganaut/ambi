// Write boundary for a single existing deck. Wraps every deck-lifecycle
// mutation (rename, updateDeck, setVisibility, share, revokeShare, remove)
// behind intent-level handlers so callers never touch RTK Query directly. The
// handlers are thin: they just fire the mutation. Cache behaviour (optimistic
// patch + response reconcile) lives in `store/enhancements/deck.ts` so it
// applies no matter who calls the mutation.
//
// Write-only by design (see z-docs/rules/frontend/hook-roles.md): read the deck
// via `useDeckQuery`; set images via `useDeckImageMutate`; edit settings via
// `useDeckSettingsMutate`; trigger UI workflows (confirm-to-delete, open in
// editor, present) via the `useDeckActions` view-model. Always scoped to one
// existing deck — deck *creation* lives in `useCreateDeck`.

import {
  UpdateDeckRequest,
  ShareDeckRequest,
  useUpdateDeckMutation,
  useDeleteDeckMutation,
  useSetDeckVisibilityMutation,
  useShareDeckMutation,
  useRevokeShareDeckMutation,
  SetVisibilityRequest,
} from "@deck/store/deckApi.gen";

interface UseDeckMutateResult {
  rename: (name: string) => void;
  /** Patch deck fields (PATCH, partial). */
  updateDeck: (patch: UpdateDeckRequest) => void;
  setVisibility: (visibility: SetVisibilityRequest["visibility"]) => void;
  share: (userId: string, role: ShareDeckRequest["role"]) => void;
  revokeShare: (userId: string) => void;
  /** Delete the deck; returns the mutation promise so callers can await it. */
  remove: () => Promise<unknown>;
}

/**
 * @param deckId the existing deck to mutate. To read the deck, use
 *   `useDeckQuery`; to create a deck, use `useCreateDeck`.
 */
const useDeckMutate = (deckId: string): UseDeckMutateResult => {
  const [updateDeckMutation] = useUpdateDeckMutation();
  const [deleteDeckMutation] = useDeleteDeckMutation();
  const [setVisibilityMutation] = useSetDeckVisibilityMutation();
  const [shareMutation] = useShareDeckMutation();
  const [revokeShareMutation] = useRevokeShareDeckMutation();

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
    rename,
    updateDeck,
    setVisibility,
    share,
    revokeShare,
    remove,
  };
};

export { useDeckMutate };
export type { UseDeckMutateResult };
