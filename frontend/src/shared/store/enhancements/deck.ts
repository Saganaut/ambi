/**
 * Optimistic + reconcile rules for deck-lifecycle mutations (the editor's
 * deck-level surface: rename, visibility, tags, sharing, cover/background images).
 *
 * Every deck edit reconciles the `getDeck` cache *from its own HTTP response*
 * rather than invalidating a tag and refetching. The mutations that can preview
 * locally (rename, visibility, tags, images) optimistically patch `getDeck` in
 * `onQueryStarted` so the navbar / pills update instantly; share / revokeShare
 * have nothing to preview (the `acl` needs server data), so they skip the
 * optimistic step. In all cases the resolved response — the same fully
 * image-hydrated `DeckResponse` that `getDeck` returns, carrying server-owned
 * `version` / `acl` / `permissions` — is written straight back into the cache.
 * On reject the optimistic patch is undone. No deck mutation triggers a
 * `GET /api/decks/{id}` refetch.
 *
 * `deleteDeck` is the exception: it *splices* the deck out of every cached
 * deck-list query (optimistic, rolled back on reject) and has nothing to
 * reconcile — the deck no longer exists.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import {
  Ambi,
  type ClearDeckBackgroundImageApiArg,
  type ClearDeckCoverImageApiArg,
  type DeckResponse,
  type ListDecksForOrgApiArg,
  type ListPublicDecksApiArg,
  type RevokeShareDeckApiArg,
  type SetDeckBackgroundImageApiArg,
  type SetDeckCoverImageApiArg,
  type SetDeckTagsApiArg,
  type SetDeckVisibilityApiArg,
  type ShareDeckApiArg,
  type UpdateDeckApiArg,
} from "../AmbiApi";
import type { CacheSyncApi, CacheSyncMutationApi } from "./types";

/**
 * Build a deck-mutation endpoint config that reconciles `getDeck` from the
 * mutation's response instead of invalidating + refetching.
 *
 * @param optimistic (optional) mutate the cached `DeckResponse` before the round
 *   trip — omit for mutations whose result needs server data (share/revoke).
 *
 * The reconcile is uniform: every deck mutation returns the full canonical
 * `DeckResponse`, so we replace the cached deck with the response wholesale.
 */
const reconcilingDeckMutation = <Arg extends { id: string }>(
  optimistic?: (draft: DeckResponse, arg: Arg) => void,
) => ({
  onQueryStarted: async (
    arg: Arg,
    { dispatch, queryFulfilled }: CacheSyncMutationApi<DeckResponse>,
  ) => {
    const patch = optimistic
      ? dispatch(
          Ambi.util.updateQueryData("getDeck", { id: arg.id }, (draft) => {
            optimistic(draft, arg);
          }),
        )
      : undefined;
    try {
      const { data } = await queryFulfilled;
      // Whole-object replace: lands server truth and clears any optional field
      // the response dropped (which Object.assign would leave behind).
      dispatch(Ambi.util.updateQueryData("getDeck", { id: arg.id }, () => data));
    } catch {
      patch?.undo();
    }
  },
});

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
  endpoints: {
    updateDeck: reconcilingDeckMutation<UpdateDeckApiArg>((draft, arg) => {
      Object.assign(draft, arg.updateDeckRequest);
    }),
    setDeckVisibility: reconcilingDeckMutation<SetDeckVisibilityApiArg>(
      (draft, arg) => {
        draft.visibility = arg.setVisibilityRequest.visibility;
      },
    ),
    setDeckTags: reconcilingDeckMutation<SetDeckTagsApiArg>((draft, arg) => {
      draft.tags = arg.setTagsRequest.tags;
    }),
    setDeckCoverImage: reconcilingDeckMutation<SetDeckCoverImageApiArg>(
      (draft, arg) => {
        draft.coverImage = arg.setImageRequest.image;
      },
    ),
    clearDeckCoverImage: reconcilingDeckMutation<ClearDeckCoverImageApiArg>(
      (draft) => {
        draft.coverImage = undefined;
      },
    ),
    setDeckBackgroundImage: reconcilingDeckMutation<SetDeckBackgroundImageApiArg>(
      (draft, arg) => {
        draft.backgroundImage = arg.setImageRequest.image;
      },
    ),
    clearDeckBackgroundImage: reconcilingDeckMutation<ClearDeckBackgroundImageApiArg>(
      (draft) => {
        draft.backgroundImage = undefined;
      },
    ),
    // share / revokeShare reshape the acl, which needs server data — no optimistic
    // preview; the response reconcile lands the new acl.
    shareDeck: reconcilingDeckMutation<ShareDeckApiArg>(),
    revokeShareDeck: reconcilingDeckMutation<RevokeShareDeckApiArg>(),
    deleteDeck: {
      onQueryStarted: (arg, api) => optimisticDeleteDeck(arg, api),
    },
  },
});
