import { emptySplitApi as api } from "../../../shared/store/emptyApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<GetMeApiResponse, GetMeApiArg>({
      query: () => ({ url: `/api/users/me` }),
    }),
    updateMe: build.mutation<UpdateMeApiResponse, UpdateMeApiArg>({
      query: (queryArg) => ({
        url: `/api/users/me`,
        method: "PATCH",
        body: queryArg.updateProfileRequest,
      }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as userApi };
export type GetMeApiResponse = /** status 200 OK */ UserProfileResponse;
export type GetMeApiArg = void;
export type UpdateMeApiResponse = /** status 200 OK */ UserProfileResponse;
export type UpdateMeApiArg = {
  updateProfileRequest: UpdateProfileRequest;
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
export type Avatar = {
  internalAvatarId?: string;
  image?: AppImage;
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
export type ThemeSpec = {
  appearance?: "LIGHT" | "DARK";
  palette?: Palette;
  backgroundImage?: AppImage;
  logoImage?: AppImage;
};
export type UserPreferences = {
  newsletter?: boolean;
  marketing?: boolean;
  theme?: ThemeSpec;
  stayLoggedIn?: boolean;
};
export type UserProfileResponse = {
  publicId?: string;
  username?: string;
  displayName?: string;
  email?: string;
  timezone?: string;
  userLevel?: "GUEST" | "USER" | "PREMIUM_USER" | "ADMIN" | "SUPER_ADMIN";
  avatar?: Avatar;
  preferences?: UserPreferences;
};
export type AvatarSelectionRequest = {
  internalAvatarId?: string;
  image?: AppImage;
};
export type UpdateProfileRequest = {
  displayName?: string;
  timezone?: string;
  avatar?: AvatarSelectionRequest;
};
export const { useGetMeQuery, useLazyGetMeQuery, useUpdateMeMutation } =
  injectedRtkApi;
