/**
 * Cache-sync rules for gallery-image mutations. The generated gallery endpoints
 * carry no tags, so — like the theme and deck surfaces — each mutation keeps the
 * paginated `listImages` cache in sync from its own response instead of
 * invalidating + refetching.
 *
 *   • addImage    → append the created image to every materialized `listImages`
 *                   page for the owning gallery (once the server confirms).
 *   • removeImage → optimistically splice the image out of every materialized
 *                   `listImages` page for that gallery, rolled back on reject.
 *
 * `listImages` is keyed by `{ id, pageable }`, so a single gallery can have
 * several cached pages live at once; we sweep every materialized query whose
 * gallery id matches rather than guessing the caller's `pageable`.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import {
  Ambi,
  type AddImageApiArg,
  type GalleryImageResponse,
  type ListImagesApiArg,
  type PagedModelGalleryImageResponse,
  type RemoveImageApiArg,
} from "../AmbiApi";
import type { CacheSyncApi, CacheSyncMutationApi, WithApiQueries } from "./types";

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
 * Append a freshly created image into every materialized `listImages` page for
 * its gallery, so both the account grid and the picker reflect it without a
 * refetch. Shared by the JSON `addImage` mutation (below) and the hand-injected
 * multipart `uploadGalleryImage` mutation (see `../endpoints/galleryUpload`).
 */
export const appendImageToGalleryLists = (
  dispatch: (action: unknown) => unknown,
  state: WithApiQueries,
  galleryId: string,
  image: GalleryImageResponse,
) => {
  for (const queryArg of listImageArgsForGallery(state, galleryId)) {
    dispatch(
      Ambi.util.updateQueryData(
        "listImages",
        queryArg,
        (draft: PagedModelGalleryImageResponse) => {
          draft.content ??= [];
          if (!draft.content.some((img) => img.id === image.id)) {
            draft.content.push(image);
          }
        },
      ),
    );
  }
};

Ambi.enhanceEndpoints({
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
          const { data } = await queryFulfilled;
          appendImageToGalleryLists(dispatch, getState(), arg.id, data);
        } catch {
          // Add failed — nothing optimistic to roll back.
        }
      },
    },
    removeImage: {
      onQueryStarted: async (arg: RemoveImageApiArg, api: CacheSyncApi) => {
        const patches: { undo: () => void }[] = [];
        for (const queryArg of listImageArgsForGallery(api.getState(), arg.id)) {
          patches.push(
            api.dispatch(
              Ambi.util.updateQueryData(
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
        }
      },
    },
  },
});
