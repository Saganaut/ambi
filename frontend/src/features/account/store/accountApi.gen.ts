import { emptySplitApi as api } from "../../../shared/store/emptyApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    updatePreferences: build.mutation<
      UpdatePreferencesApiResponse,
      UpdatePreferencesApiArg
    >({
      query: (queryArg) => ({
        url: `/api/users/me/preferences`,
        method: "PUT",
        body: queryArg.updatePreferencesRequest,
      }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as accountApi };
export type UpdatePreferencesApiResponse =
  /** status 200 OK */ UserProfileResponse;
export type UpdatePreferencesApiArg = {
  updatePreferencesRequest: UpdatePreferencesRequest;
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
export type UpdatePreferencesRequest = {
  newsletter?: boolean;
  marketing?: boolean;
  theme?: ThemeSpec;
  stayLoggedIn?: boolean;
};
export const { useUpdatePreferencesMutation } = injectedRtkApi;
