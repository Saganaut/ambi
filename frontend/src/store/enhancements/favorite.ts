/**
 * Optimistic favorite / unfavorite toggle for the deck heart.
 *
 * Flips {@code isFavorited} and adjusts {@code favoriteCount} on every cached
 * representation of the deck so the heart and counter update before the
 * round-trip completes. Reconciles on fulfillment with the authoritative
 * counter from the server, and rolls everything back on reject.
 *
 * Covered caches:
 *  - {@code getDeck} for the deck itself
 *  - {@code listDecks} and {@code listMyDecks} (void-arg lists)
 *  - every materialized {@code exploreDecks} and {@code listMyFavorites}
 *    page (args parsed back out of {@code state.api.queries}); when
 *    unfavoriting we also drop the deck from {@code listMyFavorites} pages
 *    because the server would no longer return it.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import {
  BrainFlex,
  type DeckResponse,
  type ExploreDecksApiArg,
  type ListMyFavoritesApiArg,
} from "../BrainFlexApi";
import type { CacheSyncApi } from "./types";

const adjustDeckRow = (deck: DeckResponse, desiredIsFavorited: boolean) => {
  deck.isFavorited = desiredIsFavorited;
  const current = deck.favoriteCount ?? 0;
  const next = desiredIsFavorited ? current + 1 : current - 1;
  deck.favoriteCount = Math.max(0, next);
};

const optimisticToggleFavorite = async (
  arg: { id: string },
  api: CacheSyncApi,
  desiredIsFavorited: boolean,
) => {
  const patches: { undo: () => void }[] = [];
  const patch = (action: unknown) => {
    patches.push(api.dispatch(action) as { undo: () => void });
  };

  patch(
    BrainFlex.util.updateQueryData("getDeck", { id: arg.id }, (draft) => {
      if (draft.id === arg.id) adjustDeckRow(draft, desiredIsFavorited);
    }),
  );

  const patchListInPlace = (endpointName: "listDecks" | "listMyDecks") => {
    patch(
      BrainFlex.util.updateQueryData(endpointName, undefined, (draft) => {
        for (const deck of draft) {
          if (deck.id === arg.id) adjustDeckRow(deck, desiredIsFavorited);
        }
      }),
    );
  };
  patchListInPlace("listDecks");
  patchListInPlace("listMyDecks");

  const queries = api.getState().api?.queries ?? {};

  for (const entry of Object.values(queries)) {
    if (!entry?.endpointName) continue;
    if (entry.endpointName === "exploreDecks") {
      const queryArg = (entry.originalArgs ?? {}) as ExploreDecksApiArg;
      patch(
        BrainFlex.util.updateQueryData("exploreDecks", queryArg, (draft) => {
          if (!draft.items) return;
          for (const deck of draft.items) {
            if (deck.id === arg.id) adjustDeckRow(deck, desiredIsFavorited);
          }
        }),
      );
    } else if (entry.endpointName === "listMyFavorites") {
      const queryArg = (entry.originalArgs ?? {}) as ListMyFavoritesApiArg;
      patch(
        BrainFlex.util.updateQueryData("listMyFavorites", queryArg, (draft) => {
          if (!draft.items) return;
          if (desiredIsFavorited) {
            for (const deck of draft.items) {
              if (deck.id === arg.id) adjustDeckRow(deck, desiredIsFavorited);
            }
          } else {
            const before = draft.items.length;
            draft.items = draft.items.filter((deck) => deck.id !== arg.id);
            const removed = before - draft.items.length;
            if (removed > 0 && draft.totalElements != null) {
              draft.totalElements = Math.max(0, draft.totalElements - removed);
            }
          }
        }),
      );
    }
  }

  try {
    const { data } = await api.queryFulfilled;
    const response = data as {
      deckId?: string;
      isFavorited?: boolean;
      favoriteCount?: number;
    };
    if (response.favoriteCount == null) return;
    const authoritative = response.favoriteCount;
    api.dispatch(
      BrainFlex.util.updateQueryData("getDeck", { id: arg.id }, (draft) => {
        if (draft.id === arg.id) draft.favoriteCount = authoritative;
      }),
    );
  } catch {
    for (const p of patches) p.undo();
  }
};

BrainFlex.enhanceEndpoints({
  endpoints: {
    favoriteDeck: {
      onQueryStarted: (arg, api) => optimisticToggleFavorite(arg, api, true),
    },
    unfavoriteDeck: {
      onQueryStarted: (arg, api) => optimisticToggleFavorite(arg, api, false),
    },
  },
});
