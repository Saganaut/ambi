import { emptySplitApi as api } from "../../../shared/store/emptyApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    getTheme: build.query<GetThemeApiResponse, GetThemeApiArg>({
      query: (queryArg) => ({ url: `/api/themes/${queryArg.id}` }),
    }),
    createTheme: build.mutation<CreateThemeApiResponse, CreateThemeApiArg>({
      query: (queryArg) => ({
        url: `/api/themes/${queryArg.id}`,
        method: "PUT",
        body: queryArg.createThemeRequest,
      }),
    }),
    deleteTheme: build.mutation<DeleteThemeApiResponse, DeleteThemeApiArg>({
      query: (queryArg) => ({
        url: `/api/themes/${queryArg.id}`,
        method: "DELETE",
      }),
    }),
    updateTheme: build.mutation<UpdateThemeApiResponse, UpdateThemeApiArg>({
      query: (queryArg) => ({
        url: `/api/themes/${queryArg.id}`,
        method: "PATCH",
        body: queryArg.updateThemeRequest,
      }),
    }),
    listThemesForOrg: build.query<
      ListThemesForOrgApiResponse,
      ListThemesForOrgApiArg
    >({
      query: (queryArg) => ({
        url: `/api/themes`,
        params: {
          orgId: queryArg.orgId,
        },
      }),
    }),
    listMyThemes: build.query<ListMyThemesApiResponse, ListMyThemesApiArg>({
      query: () => ({ url: `/api/themes/mine` }),
    }),
    listBuiltInThemes: build.query<
      ListBuiltInThemesApiResponse,
      ListBuiltInThemesApiArg
    >({
      query: () => ({ url: `/api/themes/built-in` }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as themeApi };
export type GetThemeApiResponse = /** status 200 OK */ ThemeResponse;
export type GetThemeApiArg = {
  id: string;
};
export type CreateThemeApiResponse = /** status 200 OK */ ThemeResponse;
export type CreateThemeApiArg = {
  id: string;
  createThemeRequest: CreateThemeRequest;
};
export type DeleteThemeApiResponse = unknown;
export type DeleteThemeApiArg = {
  id: string;
};
export type UpdateThemeApiResponse = /** status 200 OK */ ThemeResponse;
export type UpdateThemeApiArg = {
  id: string;
  updateThemeRequest: UpdateThemeRequest;
};
export type ListThemesForOrgApiResponse = /** status 200 OK */ ThemeResponse[];
export type ListThemesForOrgApiArg = {
  orgId: string;
};
export type ListMyThemesApiResponse = /** status 200 OK */ ThemeResponse[];
export type ListMyThemesApiArg = void;
export type ListBuiltInThemesApiResponse = /** status 200 OK */ ThemeResponse[];
export type ListBuiltInThemesApiArg = void;
export type Ownership = {
  type?: "USER" | "ORGANIZATION";
  ownerId?: string;
};
export type Palette = {
  canvas?: string;
  surface?: string;
  surfaceRaised?: string;
  subtle?: string;
  foreground?: string;
  mutedForeground?: string;
  primary?: string;
  onPrimary?: string;
  accent?: string;
  accentSecondary?: string;
  border?: string;
  borderSubtle?: string;
  red?: string;
  green?: string;
  yellow?: string;
  blue?: string;
};
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
export type ThemeSpec = {
  appearance?: "LIGHT" | "DARK";
  palette?: Palette;
  backgroundImage?: AppImage;
  logoImage?: AppImage;
};
export type ViewerPermissions = {
  canView: boolean;
  canEdit: boolean;
  canManage: boolean;
};
export type ThemeResponse = {
  id?: string;
  name?: string;
  ownership?: Ownership;
  organizationId?: string;
  creatorUserId?: string;
  builtIn?: boolean;
  spec?: ThemeSpec;
  createdAt?: string;
  updatedAt?: string;
  permissions: ViewerPermissions;
};
export type CreateThemeRequest = {
  name?: string;
  organizationId?: string;
  spec?: ThemeSpec;
};
export type UpdateThemeRequest = {
  name?: string;
  spec?: ThemeSpec;
};
export const {
  useGetThemeQuery,
  useLazyGetThemeQuery,
  useCreateThemeMutation,
  useDeleteThemeMutation,
  useUpdateThemeMutation,
  useListThemesForOrgQuery,
  useLazyListThemesForOrgQuery,
  useListMyThemesQuery,
  useLazyListMyThemesQuery,
  useListBuiltInThemesQuery,
  useLazyListBuiltInThemesQuery,
} = injectedRtkApi;
