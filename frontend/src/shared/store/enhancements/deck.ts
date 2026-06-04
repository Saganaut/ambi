/**
 * Tag + optimism rules for deck-lifecycle mutations (the editor's deck-level
 * surface: rename, visibility, sharing, cover/background images).
 *
 * `getDeck` is tagged `{ type: 'Deck', id }`; the mutations that edit an
 * existing deck invalidate it so RTK Query refetches the canonical, fully
 * image-hydrated DeckResponse instead of us splicing the mutation response in
 * by hand. Rename + visibility also patch `getDeck` optimistically via
 * `onQueryStarted` so the navbar title / visibility pill update instantly; the
 * invalidation refetch then reconciles. share / revokeShare reshape the `acl`,
 * which needs server data to render, so they reconcile by refetch only.
 *
 * `deleteDeck` is the exception: it *splices* the deck out of every cached
 * deck-list query (optimistic, rolled back on reject) and deliberately does
 * **not** invalidate the `Deck` tag — the deck no longer exists, so refetching
 * `getDeck` would 404. This mirrors the splice-without-tags convention in
 * `./favorite` / `./collection`.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import {
  Ambi,
  type ListDecksForOrgApiArg,
  type ListPublicDecksApiArg,
} from "../AmbiApi";
import type { CacheSyncApi } from "./types";

/** Tag for a single deck, keyed by id. */
const deckTag = (id: string) => [{ type: "Deck" as const, id }];

/**
 * Optimistically drop a deleted deck from every materialized deck-list cache,
 * rolling all patches back if the delete is rejected. Covers the void-arg
 * `listMyDecks` (the My Decks grid) plus every cached `listDecksForOrg`
 * (bare array, keyed by orgId) and `listPublicDecks` (paged `content`).
 */
const optimisticDeleteDeck = async (arg: { id: string }, api: CacheSyncApi) => {
  const patches: { undo: () => void }[] = [];
  const patch = (action: unknown) => {
    patches.push(api.dispatch(action) as { undo: () => void });
  };

  patch(
    Ambi.util.updateQueryData("listMyDecks", undefined, (draft) =>
      draft.filter((deck) => deck.id !== arg.id),
    ),
  );

  const queries = api.getState().api?.queries ?? {};
  for (const entry of Object.values(queries)) {
    if (!entry?.endpointName) continue;
    if (entry.endpointName === "listDecksForOrg") {
      const queryArg = (entry.originalArgs ?? {}) as ListDecksForOrgApiArg;
      patch(
        Ambi.util.updateQueryData("listDecksForOrg", queryArg, (draft) =>
          draft.filter((deck) => deck.id !== arg.id),
        ),
      );
    } else if (entry.endpointName === "listPublicDecks") {
      const queryArg = (entry.originalArgs ?? {}) as ListPublicDecksApiArg;
      patch(
        Ambi.util.updateQueryData("listPublicDecks", queryArg, (draft) => {
          if (!draft.content) return;
          const before = draft.content.length;
          draft.content = draft.content.filter((deck) => deck.id !== arg.id);
          const removed = before - draft.content.length;
          if (removed > 0 && draft.page?.totalElements != null) {
            draft.page.totalElements = Math.max(
              0,
              draft.page.totalElements - removed,
            );
          }
        }),
      );
    }
  }

  try {
    await api.queryFulfilled;
  } catch {
    for (const p of patches) p.undo();
  }
};

Ambi.enhanceEndpoints({
  addTagTypes: ["Deck"],
  endpoints: {
    getDeck: {
      providesTags: (_result, _error, arg) => deckTag(arg.id),
    },
    updateDeck: {
      invalidatesTags: (_result, _error, arg) => deckTag(arg.id),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("getDeck", { id: arg.id }, (draft) => {
            Object.assign(draft, arg.updateDeckRequest);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
    setDeckVisibility: {
      invalidatesTags: (_result, _error, arg) => deckTag(arg.id),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("getDeck", { id: arg.id }, (draft) => {
            draft.visibility = arg.setVisibilityRequest.visibility;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
    setDeckCoverImage: {
      invalidatesTags: (_result, _error, arg) => deckTag(arg.id),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("getDeck", { id: arg.id }, (draft) => {
            draft.coverImage = arg.setImageRequest.image;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
    clearDeckCoverImage: {
      invalidatesTags: (_result, _error, arg) => deckTag(arg.id),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("getDeck", { id: arg.id }, (draft) => {
            draft.coverImage = undefined;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
    setDeckBackgroundImage: {
      invalidatesTags: (_result, _error, arg) => deckTag(arg.id),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("getDeck", { id: arg.id }, (draft) => {
            draft.backgroundImage = arg.setImageRequest.image;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
    clearDeckBackgroundImage: {
      invalidatesTags: (_result, _error, arg) => deckTag(arg.id),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("getDeck", { id: arg.id }, (draft) => {
            draft.backgroundImage = undefined;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
    shareDeck: {
      invalidatesTags: (_result, _error, arg) => deckTag(arg.id),
    },
    revokeShareDeck: {
      invalidatesTags: (_result, _error, arg) => deckTag(arg.id),
    },
    deleteDeck: {
      onQueryStarted: (arg, api) => optimisticDeleteDeck(arg, api),
    },
  },
});
