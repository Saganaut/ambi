import { emptySplitApi as api } from "../../../shared/store/emptyApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
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
    usernameAvailable: build.query<
      UsernameAvailableApiResponse,
      UsernameAvailableApiArg
    >({
      query: (queryArg) => ({
        url: `/api/auth/username-available`,
        params: {
          username: queryArg.username,
        },
      }),
    }),
    me: build.query<MeApiResponse, MeApiArg>({
      query: () => ({ url: `/api/auth/me` }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as authApi };
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
export type UsernameAvailableApiResponse =
  /** status 200 OK */ UsernameAvailabilityResponse;
export type UsernameAvailableApiArg = {
  username: string;
};
export type MeApiResponse = /** status 200 OK */ MeResponse;
export type MeApiArg = void;
export type VisitorMe = {
  state: "VISITOR" | "GUEST" | "PRE_REGISTRATION" | "REGISTERED";
  authenticated: boolean;
  needsRegistration: boolean;
};
export type GuestMe = {
  state: "VISITOR" | "GUEST" | "PRE_REGISTRATION" | "REGISTERED";
  authenticated: boolean;
  needsRegistration: boolean;
  publicId: string;
  username: string;
  displayName: string;
  userLevel: "GUEST" | "USER" | "PREMIUM_USER" | "ADMIN" | "SUPER_ADMIN";
  effectiveTier:
    | "FREE"
    | "INDIVIDUAL"
    | "ORG_SEAT"
    | "ORG_TEAM"
    | "ORG_BUSINESS";
  membershipStatus:
    | "ACTIVE"
    | "TRIALING"
    | "PAST_DUE"
    | "CANCELED"
    | "EXPIRED"
    | "NONE";
};
export type PreRegistrationMe = {
  state: "VISITOR" | "GUEST" | "PRE_REGISTRATION" | "REGISTERED";
  authenticated: boolean;
  needsRegistration: boolean;
  email: string;
};
export type RegisteredMe = {
  state: "VISITOR" | "GUEST" | "PRE_REGISTRATION" | "REGISTERED";
  authenticated: boolean;
  needsRegistration: boolean;
  publicId: string;
  username: string;
  displayName: string;
  email: string;
  userLevel: "GUEST" | "USER" | "PREMIUM_USER" | "ADMIN" | "SUPER_ADMIN";
  effectiveTier:
    | "FREE"
    | "INDIVIDUAL"
    | "ORG_SEAT"
    | "ORG_TEAM"
    | "ORG_BUSINESS";
  membershipStatus:
    | "ACTIVE"
    | "TRIALING"
    | "PAST_DUE"
    | "CANCELED"
    | "EXPIRED"
    | "NONE";
};
export type MeResponse =
  | ({
      state: "VISITOR";
    } & VisitorMe)
  | ({
      state: "GUEST";
    } & GuestMe)
  | ({
      state: "PRE_REGISTRATION";
    } & PreRegistrationMe)
  | ({
      state: "REGISTERED";
    } & RegisteredMe);
export type RegisterRequest = {
  username: string;
  displayName?: string;
  newsletter?: boolean;
};
export type UsernameAvailabilityResponse = {
  username?: string;
  available?: boolean;
};
export const {
  useRegisterMutation,
  useRefreshMutation,
  useLogoutMutation,
  useCreateGuestMutation,
  useUsernameAvailableQuery,
  useLazyUsernameAvailableQuery,
  useMeQuery,
  useLazyMeQuery,
} = injectedRtkApi;
