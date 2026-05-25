/**
 * Optimistic deck rating. The user clicks a star → we flip `getDeck.myRating`
 * immediately so the StarRating widget fills in without waiting for the
 * round trip. On fulfill we refetch `getDeck` (so `averageRating` /
 * `ratingCount` pick up the new aggregate) and any materialized
 * `listRatings` page (so the histogram + review list re-render with the
 * new row). On reject we undo.
 *
 * `rateDeck` only returns the persisted row, not the deck aggregate —
 * that's why we refetch instead of splicing the response in.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import { BrainFlex, type ListRatingsApiArg } from "../BrainFlexApi";
import type { CacheSyncApi } from "./types";

const refetchRatingViews = (deckId: string, api: CacheSyncApi) => {
  api.dispatch(
    BrainFlex.endpoints.getDeck.initiate(
      { id: deckId },
      { subscribe: false, forceRefetch: true },
    ),
  );
  // chunk 21 — also refetch getMyRating so the reviews panel sees the new
  // review text on the caller's own row without a page reload. A 404 is OK
  // (the user may have just cleared their rating); the cache layer treats
  // that as an "errored" entry and the panel falls back to the empty state.
  api.dispatch(
    BrainFlex.endpoints.getMyRating.initiate(
      { id: deckId },
      { subscribe: false, forceRefetch: true },
    ),
  );
  const queries = api.getState().api?.queries ?? {};
  for (const entry of Object.values(queries)) {
    if (entry?.endpointName !== "listRatings") continue;
    const queryArg = (entry.originalArgs ?? {}) as ListRatingsApiArg;
    if (queryArg.id !== deckId) continue;
    api.dispatch(
      BrainFlex.endpoints.listRatings.initiate(queryArg, {
        subscribe: false,
        forceRefetch: true,
      }),
    );
  }
};

const optimisticRateDeck = async (
  arg: { id: string; rateDeckRequest: { stars?: number; review?: string } },
  api: CacheSyncApi,
) => {
  const nextStars = arg.rateDeckRequest.stars;
  const patches: { undo: () => void }[] = [];
  if (nextStars != null) {
    patches.push(
      api.dispatch(
        BrainFlex.util.updateQueryData("getDeck", { id: arg.id }, (draft) => {
          draft.myRating = nextStars;
        }),
      ) as { undo: () => void },
    );
  }
  try {
    await api.queryFulfilled;
    refetchRatingViews(arg.id, api);
  } catch {
    for (const p of patches) p.undo();
  }
};

const optimisticDeleteMyRating = async (
  arg: { id: string },
  api: CacheSyncApi,
) => {
  const patch = api.dispatch(
    BrainFlex.util.updateQueryData("getDeck", { id: arg.id }, (draft) => {
      draft.myRating = undefined;
    }),
  ) as { undo: () => void };
  try {
    await api.queryFulfilled;
    refetchRatingViews(arg.id, api);
  } catch {
    patch.undo();
  }
};

BrainFlex.enhanceEndpoints({
  endpoints: {
    rateDeck: {
      onQueryStarted: (arg, api) => optimisticRateDeck(arg, api),
    },
    deleteMyRating: {
      onQueryStarted: (arg, api) => optimisticDeleteMyRating(arg, api),
    },
  },
});
