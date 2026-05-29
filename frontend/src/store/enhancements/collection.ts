/**
 * Cache-sync rules for the deck-collection surface.
 *
 * Every mutation that touches a single collection (metadata edit, deck add /
 * remove) returns the authoritative {@link DeckCollectionResponse} summary —
 * splice it into the detail-view cache so /collections/$collectionId
 * re-renders instantly, and patch the same id in any my-collections list
 * pages the user is browsing.
 *
 * Mutations that return the summary keep `decks` null on the wire (the list
 * endpoint stays cheap). When patching the detail cache we preserve the
 * locally-hydrated `decks` array unless the server fills it in — this keeps
 * the drag-reorder UI smooth without a follow-up refetch.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import { Ambi, type DeckCollectionResponse } from "../AmbiApi";
import type { WithApiQueries } from "./types";

interface CollectionSyncApi {
  dispatch: (action: unknown) => unknown;
  getState: () => WithApiQueries;
  queryFulfilled: Promise<{ data: DeckCollectionResponse }>;
}

const syncCollectionCaches = async (
  collectionId: string | undefined,
  api: CollectionSyncApi,
) => {
  if (collectionId == null) return;
  try {
    const { data } = await api.queryFulfilled;
    api.dispatch(
      Ambi.util.updateQueryData(
        "getCollection",
        { id: collectionId },
        (draft) => {
          const preservedDecks = draft.decks;
          Object.assign(draft, data);
          if (data.decks == null) draft.decks = preservedDecks;
        },
      ),
    );
    // Patch any materialized my-collections list page. We don't know which
    // pages the user has visited, so we hit a small range — enough for the
    // common case without thrashing every cache key.
    for (let p = 0; p < 5; p++) {
      api.dispatch(
        Ambi.util.updateQueryData(
          "listMyCollections",
          { page: p, size: 24 },
          (draft) => {
            if (!draft.items) return;
            for (let i = 0; i < draft.items.length; i++) {
              if (draft.items[i].id === data.id) draft.items[i] = data;
            }
          },
        ),
      );
    }
  } catch {
    // Mutation rejected — leave the cache untouched.
  }
};

/**
 * Optimistic deck-reorder inside a collection: rewrites
 * {@link DeckCollectionResponse#deckIds} (and the embedded {@code decks} array)
 * immediately so the drag-released list doesn't snap back while the round-
 * trip is in flight. On reject, undo the patch.
 */
interface ReorderApi {
  dispatch: (action: unknown) => unknown;
  getState: () => WithApiQueries;
  queryFulfilled: Promise<{ data: DeckCollectionResponse }>;
}

const optimisticReorderCollectionDecks = async (
  arg: {
    id: string;
    reorderCollectionDecksRequest: { deckIds: string[] };
  },
  api: ReorderApi,
) => {
  const nextOrder = arg.reorderCollectionDecksRequest.deckIds;
  const patch = api.dispatch(
    Ambi.util.updateQueryData("getCollection", { id: arg.id }, (draft) => {
      draft.deckIds = [...nextOrder];
      if (draft.decks) {
        const byId = new Map(draft.decks.map((d) => [d.id ?? "", d]));
        const reordered: typeof draft.decks = [];
        for (const id of nextOrder) {
          const deck = byId.get(id);
          if (deck) reordered.push(deck);
        }
        draft.decks = reordered;
      }
    }),
  ) as { undo: () => void };
  try {
    await api.queryFulfilled;
  } catch {
    patch.undo();
  }
};

Ambi.enhanceEndpoints({
  endpoints: {
    updateCollection: {
      onQueryStarted: (arg, api) => syncCollectionCaches(arg.id, api),
    },
    addDeckToCollection: {
      onQueryStarted: (arg, api) => syncCollectionCaches(arg.id, api),
    },
    removeDeckFromCollection: {
      onQueryStarted: (arg, api) => syncCollectionCaches(arg.id, api),
    },
    reorderCollectionDecks: {
      onQueryStarted: (arg, api) => optimisticReorderCollectionDecks(arg, api),
    },
  },
});
