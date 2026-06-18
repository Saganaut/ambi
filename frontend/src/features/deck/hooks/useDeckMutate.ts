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

import { useStore } from "react-redux";

import type { RootState } from "@store/store";
import {
  UpdateDeckRequest,
  ShareDeckRequest,
  deckApi,
  useUpdateDeckMutation,
  useDeleteDeckMutation,
  useSetDeckVisibilityMutation,
  useShareDeckMutation,
  useRevokeShareDeckMutation,
  SetVisibilityRequest,
} from "@deck/store/deckApi.gen";

// The fields of a deck that `PATCH /api/decks/{id}` owns. The endpoint is a
// full-replace (an omitted field is nulled server-side), so a partial edit must
// be merged over the deck's current metadata before it goes out — otherwise
// renaming a deck would wipe its theme, language, publish status, etc. This
// projection is the single place that lists those fields: extend it if a new
// metadata field joins `UpdateDeckRequest`.
const pickMetadata = (deck: {
  name?: string;
  label?: string;
  description?: string;
  themeId?: string;
  language?: string;
  publishStatus?: UpdateDeckRequest["publishStatus"];
}): UpdateDeckRequest => ({
  name: deck.name,
  label: deck.label,
  description: deck.description,
  themeId: deck.themeId,
  language: deck.language,
  publishStatus: deck.publishStatus,
});

interface UseDeckMutateResult {
  rename: (name: string) => void;
  /**
   * Patch deck metadata. Callers pass only the fields they're changing; the
   * rest are merged from the deck's current cached metadata before the
   * (full-replace) PATCH goes out, so omitted fields are preserved, not nulled.
   */
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
  // Read-only handle on the store: we read the deck's current metadata at
  // call-time (not via a query subscription) so updateDeck stays a write
  // boundary while still merging partial patches over fresh cache state.
  const store = useStore<RootState>();

  const updateDeck = (patch: UpdateDeckRequest) => {
    const current = deckApi.endpoints.getDeck.select({ id: deckId })(
      store.getState(),
    ).data;
    if (!current) {
      // The PATCH is a full replace; without the current metadata to merge over,
      // sending the partial alone would null every omitted field. The editor
      // always has the deck cached before any edit is reachable, so this only
      // guards against a misuse — skip rather than clobber.
      console.warn(`updateDeck skipped: deck ${deckId} not in cache`);
      return;
    }
    void updateDeckMutation({
      id: deckId,
      updateDeckRequest: { ...pickMetadata(current), ...patch },
    });
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
