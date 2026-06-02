/**
 * Tag + optimism rules for deck-lifecycle mutations (the editor's deck-level
 * surface: rename, visibility, sharing).
 *
 * `getDeck` is tagged `{ type: 'Deck', id }`; the mutations that edit an
 * existing deck invalidate it so RTK Query refetches the canonical, fully
 * image-hydrated DeckResponse instead of us splicing the mutation response in
 * by hand. Rename + visibility also patch `getDeck` optimistically via
 * `onQueryStarted` so the navbar title / visibility pill update instantly; the
 * invalidation refetch then reconciles. share / revokeShare reshape the `acl`,
 * which needs server data to render, so they reconcile by refetch only.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import { Ambi } from "../AmbiApi";

/** Tag for a single deck, keyed by id. */
const deckTag = (id: string) => [{ type: "Deck" as const, id }];

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
    setVisibility: {
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
    share: {
      invalidatesTags: (_result, _error, arg) => deckTag(arg.id),
    },
    revokeShare: {
      invalidatesTags: (_result, _error, arg) => deckTag(arg.id),
    },
  },
});
