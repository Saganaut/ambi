import { emptySplitApi as api } from "../../../shared/store/emptyApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    listImages: build.query<ListImagesApiResponse, ListImagesApiArg>({
      query: (queryArg) => ({
        url: `/api/galleries/${queryArg.id}/images`,
        params: {
          pageable: queryArg.pageable,
        },
      }),
    }),
    addImage: build.mutation<AddImageApiResponse, AddImageApiArg>({
      query: (queryArg) => ({
        url: `/api/galleries/${queryArg.id}/images`,
        method: "POST",
        body: queryArg.addImageRequest,
      }),
    }),
    uploadImage: build.mutation<UploadImageApiResponse, UploadImageApiArg>({
      query: (queryArg) => ({
        url: `/api/galleries/${queryArg.id}/images/upload`,
        method: "POST",
        body: queryArg.body,
        params: {
          name: queryArg.name,
          altText: queryArg.altText,
        },
      }),
    }),
    getGallery: build.query<GetGalleryApiResponse, GetGalleryApiArg>({
      query: (queryArg) => ({ url: `/api/galleries/${queryArg.id}` }),
    }),
    deleteGallery: build.mutation<
      DeleteGalleryApiResponse,
      DeleteGalleryApiArg
    >({
      query: (queryArg) => ({
        url: `/api/galleries/${queryArg.id}`,
        method: "DELETE",
      }),
    }),
    renameGallery: build.mutation<
      RenameGalleryApiResponse,
      RenameGalleryApiArg
    >({
      query: (queryArg) => ({
        url: `/api/galleries/${queryArg.id}`,
        method: "PATCH",
        body: queryArg.renameGalleryRequest,
      }),
    }),
    getOrgGallery: build.query<GetOrgGalleryApiResponse, GetOrgGalleryApiArg>({
      query: (queryArg) => ({
        url: `/api/galleries`,
        params: {
          orgId: queryArg.orgId,
        },
      }),
    }),
    getImage: build.query<GetImageApiResponse, GetImageApiArg>({
      query: (queryArg) => ({
        url: `/api/galleries/${queryArg.id}/images/${queryArg.imageId}`,
      }),
    }),
    removeImage: build.mutation<RemoveImageApiResponse, RemoveImageApiArg>({
      query: (queryArg) => ({
        url: `/api/galleries/${queryArg.id}/images/${queryArg.imageId}`,
        method: "DELETE",
      }),
    }),
    getMyGallery: build.query<GetMyGalleryApiResponse, GetMyGalleryApiArg>({
      query: () => ({ url: `/api/galleries/mine` }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as galleryApi };
export type ListImagesApiResponse =
  /** status 200 OK */ PagedModelGalleryImageResponse;
export type ListImagesApiArg = {
  id: string;
  pageable: Pageable;
};
export type AddImageApiResponse =
  /** status 201 Created */ GalleryImageResponse;
export type AddImageApiArg = {
  id: string;
  addImageRequest: AddImageRequest;
};
export type UploadImageApiResponse =
  /** status 201 Created */ GalleryImageResponse;
export type UploadImageApiArg = {
  id: string;
  name?: string;
  altText?: string;
  body: {
    file: Blob;
  };
};
export type GetGalleryApiResponse = /** status 200 OK */ GalleryResponse;
export type GetGalleryApiArg = {
  id: string;
};
export type DeleteGalleryApiResponse = unknown;
export type DeleteGalleryApiArg = {
  id: string;
};
export type RenameGalleryApiResponse = /** status 200 OK */ GalleryResponse;
export type RenameGalleryApiArg = {
  id: string;
  renameGalleryRequest: RenameGalleryRequest;
};
export type GetOrgGalleryApiResponse = /** status 200 OK */ GalleryResponse;
export type GetOrgGalleryApiArg = {
  orgId: string;
};
export type GetImageApiResponse = /** status 200 OK */ GalleryImageResponse;
export type GetImageApiArg = {
  id: string;
  imageId: string;
};
export type RemoveImageApiResponse = unknown;
export type RemoveImageApiArg = {
  id: string;
  imageId: string;
};
export type GetMyGalleryApiResponse = /** status 200 OK */ GalleryResponse;
export type GetMyGalleryApiArg = void;
export type Placement = {
  start: number;
  end: number;
  top: number;
  bottom: number;
};
export type AppImage = {
  id?: string;
  external: boolean;
  srcKey?: string;
  externalSrc?: string;
  altText?: string;
  variants?: {
    [key: string]: string;
  };
  metadata?: {
    [key: string]: any;
  };
  placement?: Placement;
};
export type GalleryImageResponse = {
  id: string;
  galleryId: string;
  image: AppImage;
  name?: string;
  creatorUserId: string;
  createdAt: string;
  updatedAt: string;
};
export type PageMetadata = {
  size?: number;
  number?: number;
  totalElements?: number;
  totalPages?: number;
};
export type PagedModelGalleryImageResponse = {
  content?: GalleryImageResponse[];
  page?: PageMetadata;
};
export type Pageable = {
  page?: number;
  size?: number;
  sort?: string[];
};
export type AddImageRequest = {
  image: AppImage;
  name?: string;
};
export type Ownership = {
  type?: "USER" | "ORGANIZATION";
  ownerId?: string;
};
export type ViewerPermissions = {
  canView: boolean;
  canEdit: boolean;
  canManage: boolean;
};
export type GalleryResponse = {
  id: string;
  name: string;
  ownership: Ownership;
  organizationId?: string;
  creatorUserId: string;
  version: number;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
  permissions: ViewerPermissions;
};
export type RenameGalleryRequest = {
  name: string;
};
export const {
  useListImagesQuery,
  useLazyListImagesQuery,
  useAddImageMutation,
  useUploadImageMutation,
  useGetGalleryQuery,
  useLazyGetGalleryQuery,
  useDeleteGalleryMutation,
  useRenameGalleryMutation,
  useGetOrgGalleryQuery,
  useLazyGetOrgGalleryQuery,
  useGetImageQuery,
  useLazyGetImageQuery,
  useRemoveImageMutation,
  useGetMyGalleryQuery,
  useLazyGetMyGalleryQuery,
} = injectedRtkApi;
