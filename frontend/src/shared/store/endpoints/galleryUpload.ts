/**
 * Hand-injected multipart upload mutation for gallery images.
 *
 * The backend exposes two handlers on `POST /api/galleries/{id}/images`,
 * disgalleryApiguated by `Content-Type`: a JSON one (add by reference — the generated
 * `useAddImageMutation`) and a `multipart/form-data` one that ingests raw bytes.
 * OpenAPI keys operations by path+method, so the generated `galleryApiApi.ts` can only
 * represent one of them (the JSON variant). This file injects the multipart
 * sibling by hand so the generated client never needs editing.
 *
 * On success it folds the created image into the `listImages` caches via the
 * same shared helper the JSON `addImage` enhancement uses, so the account grid
 * and the picker update without a refetch.
 *
 * Imported for its side effect from `../store` (alongside `apiEnhancements`).
 */
import {
  galleryApi,
  type GalleryImageResponse,
} from "@features/gallery/store/galleryApi.gen";
import { appendImageToGalleryLists } from "../../../features/gallery/store/enhancements/gallery";
import type { WithApiQueries } from "../enhancements/types";

export interface UploadGalleryImageArg {
  /** The owning gallery's id. */
  id: string;
  /** The image file to ingest. */
  file: File;
  /** Optional label; the server defaults it to the filename when omitted. */
  name?: string;
}

const galleryUploadApi = galleryApi.injectEndpoints({
  endpoints: (build) => ({
    uploadGalleryImage: build.mutation<
      GalleryImageResponse,
      UploadGalleryImageArg
    >({
      query: ({ id, file, name }) => {
        // FormData lets fetchBaseQuery set the multipart boundary itself — do
        // NOT set Content-Type by hand or the boundary is lost.
        const body = new FormData();
        body.append("file", file);
        if (name && name.trim()) body.append("name", name.trim());
        return { url: `/api/galleries/${id}/images`, method: "POST", body };
      },
      onQueryStarted: async (
        { id },
        { dispatch, getState, queryFulfilled },
      ) => {
        try {
          const { data } = await queryFulfilled;
          appendImageToGalleryLists(
            dispatch,
            getState() as WithApiQueries,
            id,
            data,
          );
        } catch {
          // Upload failed — nothing optimistic to roll back.
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const { useUploadGalleryImageMutation } = galleryUploadApi;
