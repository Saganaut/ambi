/**
 * Cache-sync rules for the slide-discussion surface (the editor's right-sidebar
 * Discussion panel). One query holds the state: `listSlideCommentThreads` — a
 * slide's threads, paginated, newest-first, each carrying its comments inline.
 * Every mutation returns the whole `CommentThreadResponse`, so each handler
 * reconciles that cache *from its own response* rather than invalidating a tag
 * and refetching (the house strategy — see `../apiEnhancements`).
 *
 *  - `createCommentThread`: prepend the new thread to every cached page-0 list
 *    for the slide and bump the global `totalElements`; trim back to page size.
 *  - `addThreadComment` / `updateThreadComment` / `deleteThreadComment` /
 *    `setThreadStatus`: replace the thread by id wherever it's cached. (A soft
 *    delete keeps the comment row; the server returns it redacted.)
 *
 * Thread and comment ids are server-minted, so there is nothing to optimistically
 * insert by id ahead of the round trip; the reconcile lands once it resolves.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import {
  Ambi,
  type AddThreadCommentApiArg,
  type CommentThreadResponse,
  type CreateCommentThreadApiArg,
  type DeleteThreadCommentApiArg,
  type ListSlideCommentThreadsApiArg,
  type PagedModelCommentThreadResponse,
  type SetThreadStatusApiArg,
  type UpdateThreadCommentApiArg,
} from "../AmbiApi";
import type { CacheSyncApi } from "./types";

/** Apply `recipe` to every cached threads-page for `(deckId, slideId)`. */
const patchSlideThreads = (
  api: CacheSyncApi,
  deckId: string,
  slideId: string,
  recipe: (
    draft: PagedModelCommentThreadResponse,
    queryArg: ListSlideCommentThreadsApiArg,
  ) => void,
) => {
  const queries = api.getState().api?.queries ?? {};
  for (const entry of Object.values(queries)) {
    if (!entry?.endpointName) continue;
    if (entry.endpointName !== "listSlideCommentThreads") continue;
    const queryArg = (entry.originalArgs ?? {}) as ListSlideCommentThreadsApiArg;
    if (queryArg.deckId !== deckId || queryArg.slideId !== slideId) continue;
    api.dispatch(
      Ambi.util.updateQueryData("listSlideCommentThreads", queryArg, (draft) => {
        recipe(draft, queryArg);
      }),
    );
  }
};

/** Replace a thread by id wherever it's cached for the slide. */
const replaceThread = (
  api: CacheSyncApi,
  deckId: string,
  slideId: string,
  thread: CommentThreadResponse,
) => {
  patchSlideThreads(api, deckId, slideId, (draft) => {
    const idx = draft.content?.findIndex((t) => t.id === thread.id) ?? -1;
    if (draft.content && idx !== -1) draft.content[idx] = thread;
  });
};

/**
 * Build a thread-mutation config that reconciles the threads list by replacing
 * the returned thread in place — shared by reply / edit / delete / set-status,
 * all of which return the full updated `CommentThreadResponse`.
 */
const reconcileThreadMutation = <
  Arg extends { deckId: string; slideId: string },
>() => ({
  onQueryStarted: async (arg: Arg, api: CacheSyncApi) => {
    try {
      const { data } = (await api.queryFulfilled) as { data: CommentThreadResponse };
      replaceThread(api, arg.deckId, arg.slideId, data);
    } catch {
      // No optimistic patch to roll back.
    }
  },
});

Ambi.enhanceEndpoints({
  endpoints: {
    createCommentThread: {
      onQueryStarted: async (arg: CreateCommentThreadApiArg, api: CacheSyncApi) => {
        let data: CommentThreadResponse;
        try {
          ({ data } = (await api.queryFulfilled) as { data: CommentThreadResponse });
        } catch {
          return; // nothing optimistic to undo
        }
        patchSlideThreads(api, arg.deckId, arg.slideId, (draft, queryArg) => {
          draft.page ??= {};
          draft.page.totalElements = (draft.page.totalElements ?? 0) + 1;
          const pageNumber = queryArg.pageable.page ?? 0;
          if (pageNumber !== 0) return;
          draft.content ??= [];
          if (draft.content.some((t) => t.id === data.id)) return;
          draft.content.unshift(data);
          const size = queryArg.pageable.size;
          if (size != null && draft.content.length > size) draft.content.pop();
        });
      },
    },
    addThreadComment: reconcileThreadMutation<AddThreadCommentApiArg>(),
    updateThreadComment: reconcileThreadMutation<UpdateThreadCommentApiArg>(),
    deleteThreadComment: reconcileThreadMutation<DeleteThreadCommentApiArg>(),
    setThreadStatus: reconcileThreadMutation<SetThreadStatusApiArg>(),
  },
});
