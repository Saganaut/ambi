import { emptySplitApi as api } from "./emptyApi";
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
    register: build.mutation<RegisterApiResponse, RegisterApiArg>({
      query: (queryArg) => ({
        url: `/api/auth/register`,
        method: "POST",
        body: queryArg.registerRequest,
      }),
    }),
    refresh: build.mutation<RefreshApiResponse, RefreshApiArg>({
      query: () => ({ url: `/api/auth/refresh`, method: "POST" }),
    }),
    logout: build.mutation<LogoutApiResponse, LogoutApiArg>({
      query: () => ({ url: `/api/auth/logout`, method: "POST" }),
    }),
    createGuest: build.mutation<CreateGuestApiResponse, CreateGuestApiArg>({
      query: () => ({ url: `/api/auth/guest`, method: "POST" }),
    }),
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
    me: build.query<MeApiResponse, MeApiArg>({
      query: () => ({ url: `/api/auth/me` }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as Ambi };
export type UpdatePreferencesApiResponse =
  /** status 200 OK */ UserProfileResponse;
export type UpdatePreferencesApiArg = {
  updatePreferencesRequest: UpdatePreferencesRequest;
};
export type RegisterApiResponse = /** status 200 OK */ MeResponse;
export type RegisterApiArg = {
  registerRequest: RegisterRequest;
};
export type RefreshApiResponse = /** status 200 OK */ MeResponse;
export type RefreshApiArg = void;
export type LogoutApiResponse = unknown;
export type LogoutApiArg = void;
export type CreateGuestApiResponse = /** status 200 OK */ MeResponse;
export type CreateGuestApiArg = void;
export type GetMeApiResponse = /** status 200 OK */ UserProfileResponse;
export type GetMeApiArg = void;
export type UpdateMeApiResponse = /** status 200 OK */ UserProfileResponse;
export type UpdateMeApiArg = {
  updateProfileRequest: UpdateProfileRequest;
};
export type MeApiResponse = /** status 200 OK */ MeResponse;
export type MeApiArg = void;
export type Avatar = {
  external?: boolean;
  externalSrc?: string;
  srcKey?: string;
  internalAvatarId?: string;
};
export type Theme = any;
export type UserPreferences = {
  newsletter?: boolean;
  marketing?: boolean;
  theme?: Theme;
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
  theme?: Theme;
  stayLoggedIn?: boolean;
};
export type MeResponse = {
  authenticated?: boolean;
  state?: "VISITOR" | "GUEST" | "PRE_REGISTRATION" | "REGISTERED";
  needsRegistration?: boolean;
  publicId?: string;
  username?: string;
  displayName?: string;
  email?: string;
  userLevel?: "GUEST" | "USER" | "PREMIUM_USER" | "ADMIN" | "SUPER_ADMIN";
  effectiveTier?:
    | "FREE"
    | "INDIVIDUAL"
    | "ORG_SEAT"
    | "ORG_TEAM"
    | "ORG_BUSINESS";
  membershipStatus?:
    | "ACTIVE"
    | "TRIALING"
    | "PAST_DUE"
    | "CANCELED"
    | "EXPIRED"
    | "NONE";
};
export type RegisterRequest = {
  username: string;
  displayName?: string;
  newsletter?: boolean;
};
export type AvatarSelection = {
  externalSrc?: string;
  internalAvatarId?: string;
};
export type UpdateProfileRequest = {
  displayName?: string;
  timezone?: string;
  avatar?: AvatarSelection;
};
export const {
  useUpdatePreferencesMutation,
  useRegisterMutation,
  useRefreshMutation,
  useLogoutMutation,
  useCreateGuestMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useUpdateMeMutation,
  useMeQuery,
  useLazyMeQuery,
} = injectedRtkApi;
