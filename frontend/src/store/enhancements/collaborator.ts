/**
 * Cache-sync rules for deck collaborators (the Share modal surface) and
 * ownership transfer.
 *
 * After a collaborator mutation, splice the new row into the
 * `listCollaborators` cache for {deckId} so the Share modal updates without
 * a refetch. For removes / role updates we re-fetch to pick up the full
 * list state — the mutation response is either void or a single row, which
 * isn't enough to rebuild the list locally for cases like transferOwnership
 * that touch two rows.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import { Ambi, type DeckCollaboratorResponse } from "../AmbiApi";
import type { WithApiQueries } from "./types";

interface CollaboratorSyncApi {
  dispatch: (action: unknown) => unknown;
  getState: () => WithApiQueries;
  queryFulfilled: Promise<{ data: unknown }>;
}

const refetchCollaborators = (deckId: string, api: CollaboratorSyncApi) => {
  void api.queryFulfilled.then(
    () => {
      api.dispatch(
        Ambi.endpoints.listCollaborators.initiate(
          { id: deckId },
          { subscribe: false, forceRefetch: true },
        ),
      );
    },
    () => {
      // Mutation rejected — leave the cache alone.
    },
  );
};

const upsertCollaboratorRow = async (
  deckId: string,
  api: CollaboratorSyncApi,
) => {
  try {
    const { data } = await api.queryFulfilled;
    const next = data as DeckCollaboratorResponse;
    api.dispatch(
      Ambi.util.updateQueryData(
        "listCollaborators",
        { id: deckId },
        (draft) => {
          const idx = draft.findIndex(
            (r) =>
              r.user?.userId === next.user?.userId && next.user?.userId != null,
          );
          if (idx >= 0) draft[idx] = next;
          else draft.push(next);
        },
      ),
    );
  } catch {
    // ignore
  }
};

Ambi.enhanceEndpoints({
  endpoints: {
    inviteCollaborator: {
      onQueryStarted: (arg, api) => upsertCollaboratorRow(arg.id, api),
    },
    updateCollaboratorRole: {
      onQueryStarted: (arg, api) => upsertCollaboratorRow(arg.id, api),
    },
    removeCollaborator: {
      onQueryStarted: (arg, api) => {
        refetchCollaborators(arg.id, api);
      },
    },
    transferOwnership: {
      onQueryStarted: async (arg, api) => {
        refetchCollaborators(arg.id, api);
        // Ownership change flips the caller's myRole; refetch the deck so the
        // Share button's owner-only controls disappear instantly for the
        // demoted owner.
        try {
          await api.queryFulfilled;
          void api.dispatch(
            Ambi.endpoints.getDeck.initiate(
              { id: arg.id },
              { subscribe: false, forceRefetch: true },
            ),
          );
        } catch {
          // Mutation rejected — caller stays owner, no cache change.
        }
      },
    },
  },
});
