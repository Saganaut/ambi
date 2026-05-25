/**
 * Cache-sync rules for deck-element + deck-lifecycle mutations.
 *
 * Every mutation in this group returns the canonical updated DeckResponse with
 * presigned `imgUrl` values fully hydrated (the controller runs the same
 * DeckImageHydrationService.hydrate on every mutation response that it runs
 * on `getDeck`). We splice that response into the `getDeck` query cache so
 * any subscribed component re-renders without a refetch and without any
 * stale-URL merge dance on the client.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel; do not
 * remove that import or these mutations will silently fall out of sync.
 */
import { BrainFlex, type DeckResponse } from "../BrainFlexApi";
import type { CacheSyncApi } from "./types";

const syncDeckCache = async (arg: { id: string }, api: CacheSyncApi) => {
  try {
    const { data } = await api.queryFulfilled;
    api.dispatch(
      BrainFlex.util.upsertQueryData(
        "getDeck",
        { id: arg.id },
        data as DeckResponse,
      ),
    );
  } catch {
    // Mutation rejected — leave the cache untouched; the failing component
    // is responsible for surfacing the error.
  }
};

BrainFlex.enhanceEndpoints({
  endpoints: {
    addElement: {
      onQueryStarted: (arg, api) => syncDeckCache(arg, api),
    },
    moveElement: {
      onQueryStarted: (arg, api) => syncDeckCache(arg, api),
    },
    moveMcqOption: {
      onQueryStarted: (arg, api) => syncDeckCache(arg, api),
    },
    deleteElement: {
      onQueryStarted: (arg, api) => syncDeckCache(arg, api),
    },
    updateElement: {
      onQueryStarted: (arg, api) => syncDeckCache(arg, api),
    },
    updateDeck: {
      onQueryStarted: (arg, api) => syncDeckCache(arg, api),
    },
    // Publish lifecycle mutations also return the canonical DeckResponse, so the
    // status pill in the editor navbar updates instantly without a refetch.
    publishDeck: {
      onQueryStarted: (arg, api) => syncDeckCache(arg, api),
    },
    unpublishDeck: {
      onQueryStarted: (arg, api) => syncDeckCache(arg, api),
    },
    archiveDeck: {
      onQueryStarted: (arg, api) => syncDeckCache(arg, api),
    },
  },
});
