/**
 * Optimistic comment-upvote toggle for the deck-discussion threads.
 *
 * The server endpoint is idempotent (POSTing twice in a row leaves the row
 * in its original state), so the optimistic flip derives its target state
 * from whichever cache copy of the comment we find first — `listComments`
 * pages for the deck, then `listReplies` pages. Every cached row that
 * matches is patched in lockstep so a comment that appears in both a top-
 * level page (as a parent counted by `replyCount`) and a reply page (as a
 * sibling reply) stays in sync.
 *
 * On fulfillment we splice the authoritative {@link DeckCommentResponse} into
 * every matching cache so the counters reconcile to what the server
 * actually wrote; on reject we undo every optimistic patch.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import {
  Ambi,
  type DeckCommentResponse,
  type ListCommentsApiArg,
  type ListRepliesApiArg,
} from "../AmbiApi";
import type { CacheSyncApi } from "./types";

const optimisticToggleCommentUpvote = async (
  arg: { deckId: string; commentId: string },
  api: CacheSyncApi,
) => {
  const queries = api.getState().api?.queries ?? {};

  // First pass: find a cached copy so we know which way the toggle should go.
  // The endpoint is idempotent on the server, but the optimistic flip needs a
  // concrete next state to write into the cache; without a cached row we let
  // the round-trip happen unoptimistically.
  let nextUpvoted: boolean | null = null;
  for (const entry of Object.values(queries)) {
    if (!entry?.endpointName) continue;
    if (
      entry.endpointName !== "listComments" &&
      entry.endpointName !== "listReplies"
    )
      continue;
    const cacheKey = `${entry.endpointName}(${JSON.stringify(entry.originalArgs ?? null)})`;
    const cached = (
      api.getState() as {
        api?: {
          queries?: Record<
            string,
            { data?: { items?: DeckCommentResponse[] } }
          >;
        };
      }
    ).api?.queries?.[cacheKey]?.data;
    const items = cached?.items ?? [];
    const found = items.find((c) => c.id === arg.commentId);
    if (found) {
      nextUpvoted = !(found.upvotedByMe ?? false);
      break;
    }
  }

  const patches: { undo: () => void }[] = [];
  const flipRow = (row: DeckCommentResponse, target: boolean) => {
    const current = row.upvotes ?? 0;
    const wasUpvoted = row.upvotedByMe ?? false;
    if (wasUpvoted === target) return;
    row.upvotedByMe = target;
    row.upvotes = Math.max(0, target ? current + 1 : current - 1);
  };

  if (nextUpvoted !== null) {
    const target = nextUpvoted;
    for (const entry of Object.values(queries)) {
      if (!entry?.endpointName) continue;
      if (entry.endpointName === "listComments") {
        const queryArg = (entry.originalArgs ?? {}) as ListCommentsApiArg;
        if (queryArg.id !== arg.deckId) continue;
        patches.push(
          api.dispatch(
            Ambi.util.updateQueryData("listComments", queryArg, (draft) => {
              if (!draft.items) return;
              for (const row of draft.items) {
                if (row.id === arg.commentId) flipRow(row, target);
              }
            }),
          ) as { undo: () => void },
        );
      } else if (entry.endpointName === "listReplies") {
        const queryArg = (entry.originalArgs ?? {}) as ListRepliesApiArg;
        if (queryArg.deckId !== arg.deckId) continue;
        patches.push(
          api.dispatch(
            Ambi.util.updateQueryData("listReplies", queryArg, (draft) => {
              if (!draft.items) return;
              for (const row of draft.items) {
                if (row.id === arg.commentId) flipRow(row, target);
              }
            }),
          ) as { undo: () => void },
        );
      }
    }
  }

  try {
    const { data } = await api.queryFulfilled;
    const authoritative = data as DeckCommentResponse;
    if (authoritative.id == null) return;
    for (const entry of Object.values(queries)) {
      if (!entry?.endpointName) continue;
      if (entry.endpointName === "listComments") {
        const queryArg = (entry.originalArgs ?? {}) as ListCommentsApiArg;
        if (queryArg.id !== arg.deckId) continue;
        api.dispatch(
          Ambi.util.updateQueryData("listComments", queryArg, (draft) => {
            if (!draft.items) return;
            for (let i = 0; i < draft.items.length; i++) {
              if (draft.items[i].id === authoritative.id) {
                draft.items[i] = {
                  ...draft.items[i],
                  upvotes: authoritative.upvotes,
                  upvotedByMe: authoritative.upvotedByMe,
                  updatedAt: authoritative.updatedAt,
                };
              }
            }
          }),
        );
      } else if (entry.endpointName === "listReplies") {
        const queryArg = (entry.originalArgs ?? {}) as ListRepliesApiArg;
        if (queryArg.deckId !== arg.deckId) continue;
        api.dispatch(
          Ambi.util.updateQueryData("listReplies", queryArg, (draft) => {
            if (!draft.items) return;
            for (let i = 0; i < draft.items.length; i++) {
              if (draft.items[i].id === authoritative.id) {
                draft.items[i] = {
                  ...draft.items[i],
                  upvotes: authoritative.upvotes,
                  upvotedByMe: authoritative.upvotedByMe,
                  updatedAt: authoritative.updatedAt,
                };
              }
            }
          }),
        );
      }
    }
  } catch {
    for (const p of patches) p.undo();
  }
};

Ambi.enhanceEndpoints({
  endpoints: {
    toggleCommentUpvote: {
      onQueryStarted: (arg, api) => optimisticToggleCommentUpvote(arg, api),
    },
  },
});
