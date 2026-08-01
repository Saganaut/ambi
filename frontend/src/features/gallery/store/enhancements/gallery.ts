/**
 * Cache-sync rules for gallery-image mutations. The generated gallery endpoints
 * carry no tags, so each mutation reconciles the paginated `listImages` cache
 * itself rather than relying on tag invalidation.
 *
 * `listImages` is server-driven: `{ id, search, pageable }` selects one true
 * page of a sorted, optionally filtered collection. That makes a local splice
 * unsound as the *final* state — whether a new image belongs on the page in view
 * depends on the sort and the search term, and removing one leaves the page a
 * row short of the size the server would have returned. So each mutation
 * re-reads every materialized page for that gallery once the server confirms:
 *
 *   • addImage / uploadImage → refetch (the image may sort anywhere, or nowhere
 *                              if it doesn't match the active search).
 *   • removeImage           → optimistically drop the tile so it disappears
 *                              without a round-trip (rolled back on reject),
 *                              then refetch so the page refills and the totals
 *                              — which drive the pager — come from the server.
 *
 * A single gallery can have several cached pages live at once, so we sweep every
 * materialized query whose gallery id matches rather than guessing the caller's
 * `pageable`.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import {
  galleryApi,
  type AddImageApiArg,
  type GalleryImageResponse,
  type ListImagesApiArg,
  type PagedModelGalleryImageResponse,
  type RemoveImageApiArg,
  type UploadImageApiArg,
} from "../galleryApi.gen";
import type {
  CacheSyncApi,
  CacheSyncMutationApi,
  WithApiQueries,
} from "../../../../shared/store/enhancements/Enhancements.types";

/** Args of every materialized `listImages` query whose gallery id matches. */
const listImageArgsForGallery = (
  state: WithApiQueries,
  galleryId: string,
): ListImagesApiArg[] => {
  const queries = state.api?.queries ?? {};
  const args: ListImagesApiArg[] = [];
  for (const entry of Object.values(queries)) {
    if (entry?.endpointName !== "listImages") continue;
    const queryArg = (entry.originalArgs ?? {}) as ListImagesApiArg;
    if (queryArg.id === galleryId) args.push(queryArg);
  }
  return args;
};

/**
 * Re-read every materialized `listImages` page for a gallery. `subscribe: false`
 * keeps this from holding the entries alive on its own — it only refreshes what
 * the account grid and the picker are already showing.
 */
export const refetchGalleryLists = (
  dispatch: (action: unknown) => unknown,
  state: WithApiQueries,
  galleryId: string,
) => {
  for (const queryArg of listImageArgsForGallery(state, galleryId)) {
    dispatch(
      galleryApi.endpoints.listImages.initiate(queryArg, {
        subscribe: false,
        forceRefetch: true,
      }),
    );
  }
};

galleryApi.enhanceEndpoints({
  endpoints: {
    addImage: {
      onQueryStarted: async (
        arg: AddImageApiArg,
        {
          dispatch,
          getState,
          queryFulfilled,
        }: CacheSyncMutationApi<GalleryImageResponse> & {
          getState: () => WithApiQueries;
        },
      ) => {
        try {
          await queryFulfilled;
          refetchGalleryLists(dispatch, getState(), arg.id);
        } catch {
          // Add failed — nothing optimistic to roll back.
        }
      },
    },
    uploadImage: {
      onQueryStarted: async (
        arg: UploadImageApiArg,
        {
          dispatch,
          getState,
          queryFulfilled,
        }: CacheSyncMutationApi<GalleryImageResponse> & {
          getState: () => WithApiQueries;
        },
      ) => {
        try {
          await queryFulfilled;
          refetchGalleryLists(dispatch, getState(), arg.id);
        } catch {
          // Upload failed — nothing optimistic to roll back.
        }
      },
    },
    removeImage: {
      onQueryStarted: async (arg: RemoveImageApiArg, api: CacheSyncApi) => {
        const patches: { undo: () => void }[] = [];
        for (const queryArg of listImageArgsForGallery(
          api.getState(),
          arg.id,
        )) {
          patches.push(
            api.dispatch(
              galleryApi.util.updateQueryData(
                "listImages",
                queryArg,
                (draft: PagedModelGalleryImageResponse) => {
                  if (!draft.content) return;
                  draft.content = draft.content.filter(
                    (img) => img.id !== arg.imageId,
                  );
                },
              ),
            ) as { undo: () => void },
          );
        }
        try {
          await api.queryFulfilled;
        } catch {
          for (const p of patches) p.undo();
          return;
        }
        refetchGalleryLists(api.dispatch, api.getState(), arg.id);
      },
    },
  },
});
