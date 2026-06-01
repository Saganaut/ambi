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
    getTheme: build.query<GetThemeApiResponse, GetThemeApiArg>({
      query: (queryArg) => ({ url: `/api/themes/${queryArg.id}` }),
    }),
    create: build.mutation<CreateApiResponse, CreateApiArg>({
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
    getDeck: build.query<GetDeckApiResponse, GetDeckApiArg>({
      query: (queryArg) => ({ url: `/api/decks/${queryArg.id}` }),
    }),
    create1: build.mutation<Create1ApiResponse, Create1ApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}`,
        method: "PUT",
      }),
    }),
    deleteDeck: build.mutation<DeleteDeckApiResponse, DeleteDeckApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}`,
        method: "DELETE",
      }),
    }),
    updateDeck: build.mutation<UpdateDeckApiResponse, UpdateDeckApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}`,
        method: "PATCH",
        body: queryArg.updateDeckRequest,
      }),
    }),
    setVisibility: build.mutation<
      SetVisibilityApiResponse,
      SetVisibilityApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/visibility`,
        method: "PUT",
        body: queryArg.setVisibilityRequest,
      }),
    }),
    getSlide: build.query<GetSlideApiResponse, GetSlideApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}`,
      }),
    }),
    updateSlide: build.mutation<UpdateSlideApiResponse, UpdateSlideApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}`,
        method: "PUT",
        body: queryArg.slideRequest,
      }),
    }),
    removeSlide: build.mutation<RemoveSlideApiResponse, RemoveSlideApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}`,
        method: "DELETE",
      }),
    }),
    share: build.mutation<ShareApiResponse, ShareApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/shares/${queryArg.userId}`,
        method: "PUT",
        body: queryArg.shareDeckRequest,
      }),
    }),
    revokeShare: build.mutation<RevokeShareApiResponse, RevokeShareApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/shares/${queryArg.userId}`,
        method: "DELETE",
      }),
    }),
    listSlides: build.query<ListSlidesApiResponse, ListSlidesApiArg>({
      query: (queryArg) => ({ url: `/api/decks/${queryArg.id}/slides` }),
    }),
    addSlide: build.mutation<AddSlideApiResponse, AddSlideApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides`,
        method: "POST",
        body: queryArg.slideRequest,
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
    moveSlide: build.mutation<MoveSlideApiResponse, MoveSlideApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}/move`,
        method: "PATCH",
        body: queryArg.moveSlideRequest,
      }),
    }),
    listForOrg: build.query<ListForOrgApiResponse, ListForOrgApiArg>({
      query: (queryArg) => ({
        url: `/api/themes`,
        params: {
          orgId: queryArg.orgId,
        },
      }),
    }),
    listMine: build.query<ListMineApiResponse, ListMineApiArg>({
      query: () => ({ url: `/api/themes/mine` }),
    }),
    listBuiltIn: build.query<ListBuiltInApiResponse, ListBuiltInApiArg>({
      query: () => ({ url: `/api/themes/built-in` }),
    }),
    listForOrg1: build.query<ListForOrg1ApiResponse, ListForOrg1ApiArg>({
      query: (queryArg) => ({
        url: `/api/decks`,
        params: {
          orgId: queryArg.orgId,
        },
      }),
    }),
    listPublic: build.query<ListPublicApiResponse, ListPublicApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/public`,
        params: {
          pageable: queryArg.pageable,
        },
      }),
    }),
    listMine1: build.query<ListMine1ApiResponse, ListMine1ApiArg>({
      query: () => ({ url: `/api/decks/mine` }),
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
export { injectedRtkApi as Ambi };
export type UpdatePreferencesApiResponse =
  /** status 200 OK */ UserProfileResponse;
export type UpdatePreferencesApiArg = {
  updatePreferencesRequest: UpdatePreferencesRequest;
};
export type GetThemeApiResponse = /** status 200 OK */ ThemeResponse;
export type GetThemeApiArg = {
  id: string;
};
export type CreateApiResponse = /** status 200 OK */ ThemeResponse;
export type CreateApiArg = {
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
export type GetDeckApiResponse = /** status 200 OK */ DeckResponse;
export type GetDeckApiArg = {
  id: string;
};
export type Create1ApiResponse = /** status 200 OK */ DeckResponse;
export type Create1ApiArg = {
  id: string;
};
export type DeleteDeckApiResponse = unknown;
export type DeleteDeckApiArg = {
  id: string;
};
export type UpdateDeckApiResponse = /** status 200 OK */ DeckResponse;
export type UpdateDeckApiArg = {
  id: string;
  updateDeckRequest: UpdateDeckRequest;
};
export type SetVisibilityApiResponse = /** status 200 OK */ DeckResponse;
export type SetVisibilityApiArg = {
  id: string;
  setVisibilityRequest: SetVisibilityRequest;
};
export type GetSlideApiResponse = /** status 200 OK */ SlideResponse;
export type GetSlideApiArg = {
  id: string;
  slideId: string;
};
export type UpdateSlideApiResponse = /** status 200 OK */ SlideResponse;
export type UpdateSlideApiArg = {
  id: string;
  slideId: string;
  slideRequest: SlideRequest;
};
export type RemoveSlideApiResponse = unknown;
export type RemoveSlideApiArg = {
  id: string;
  slideId: string;
};
export type ShareApiResponse = /** status 200 OK */ DeckResponse;
export type ShareApiArg = {
  id: string;
  userId: string;
  shareDeckRequest: ShareDeckRequest;
};
export type RevokeShareApiResponse = /** status 200 OK */ DeckResponse;
export type RevokeShareApiArg = {
  id: string;
  userId: string;
};
export type ListSlidesApiResponse = /** status 200 OK */ SlideResponse[];
export type ListSlidesApiArg = {
  id: string;
};
export type AddSlideApiResponse = /** status 201 Created */ SlideResponse;
export type AddSlideApiArg = {
  id: string;
  slideRequest: SlideRequest;
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
export type MoveSlideApiResponse = /** status 200 OK */ DeckResponse;
export type MoveSlideApiArg = {
  id: string;
  slideId: string;
  moveSlideRequest: MoveSlideRequest;
};
export type ListForOrgApiResponse = /** status 200 OK */ ThemeResponse[];
export type ListForOrgApiArg = {
  orgId: string;
};
export type ListMineApiResponse = /** status 200 OK */ ThemeResponse[];
export type ListMineApiArg = void;
export type ListBuiltInApiResponse = /** status 200 OK */ ThemeResponse[];
export type ListBuiltInApiArg = void;
export type ListForOrg1ApiResponse = /** status 200 OK */ DeckResponse[];
export type ListForOrg1ApiArg = {
  orgId: string;
};
export type ListPublicApiResponse = /** status 200 OK */ PagedModelDeckResponse;
export type ListPublicApiArg = {
  pageable: Pageable;
};
export type ListMine1ApiResponse = /** status 200 OK */ DeckResponse[];
export type ListMine1ApiArg = void;
export type UsernameAvailableApiResponse =
  /** status 200 OK */ UsernameAvailabilityResponse;
export type UsernameAvailableApiArg = {
  username: string;
};
export type MeApiResponse = /** status 200 OK */ MeResponse;
export type MeApiArg = void;
export type Avatar = {
  external?: boolean;
  externalSrc?: string;
  srcKey?: string;
  internalAvatarId?: string;
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
export type ThemeSpec = {
  mode?: "LIGHT" | "DARK" | "SYSTEM";
  huePrimary?: number;
  hueAccent?: number;
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
export type ThemeOwnership = {
  type?: "USER" | "ORGANIZATION";
  ownerId?: string;
};
export type ThemeResponse = {
  id?: string;
  name?: string;
  ownership?: ThemeOwnership;
  organizationId?: string;
  creatorUserId?: string;
  builtIn?: boolean;
  spec?: ThemeSpec;
  createdAt?: string;
  updatedAt?: string;
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
export type StreakMilestone = {
  countRequired?: number;
  bonusPoints?: number;
};
export type PointSettings = {
  points?: number;
  deceptionPoints?: number;
  bestAnswerPoints?: number;
  fastestCorrectAnswerPoints?: number;
  streakBonuses?: {
    [key: string]: StreakMilestone;
  };
  resetStreakOnStreakEnd?: boolean;
};
export type AnswerSettings = {
  displayResultsLive?: boolean;
  allowMultipleAnswers?: boolean;
  shuffleOptions?: boolean;
  anonymizeAnswers?: boolean;
  countdownTime?: number;
};
export type AudienceSettings = {
  maxParticipants?: number;
  reactionsEnabled?: boolean;
  chatEnabled?: boolean;
  allowLateJoin?: boolean;
  allowReJoin?: boolean;
  anonymousMode?: boolean;
  allowGuests?: boolean;
};
export type DeckSettings = {
  pointSettings?: PointSettings;
  answerSettings?: AnswerSettings;
  audienceSettings?: AudienceSettings;
};
export type DeckOwnership = {
  type?: "USER" | "ORGANIZATION";
  ownerId?: string;
};
export type DeckAccessGrant = {
  userId?: string;
  role?: "VIEWER" | "EDITOR";
};
export type DeckStats = any;
export type DeckResponse = {
  id: string;
  publicId: string;
  name: string;
  description?: string;
  coverImage?: AppImage;
  backgroundImage?: AppImage;
  themeId?: string;
  version: number;
  publishStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  visibility: "PRIVATE" | "UNLISTED" | "ORG" | "PUBLIC";
  publishedAt?: string;
  language: string;
  creatorUserId: string;
  originalAuthorUserId: string;
  settings?: DeckSettings;
  tags: string[];
  organizationId?: string;
  ownership: DeckOwnership;
  acl: DeckAccessGrant[];
  parentDeckId?: string;
  stats?: DeckStats;
  createdAt: string;
  updatedAt: string;
};
export type UpdateDeckRequest = {
  name?: string;
  description?: string;
  coverImage?: AppImage;
  backgroundImage?: AppImage;
  themeId?: string;
  language?: string;
  settings?: DeckSettings;
  tags?: string[];
  publishStatus?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};
export type SetVisibilityRequest = {
  visibility: "PRIVATE" | "UNLISTED" | "ORG" | "PUBLIC";
};
export type McqOption = {
  id?: string;
  optionType?: "TEXT" | "NUMBER" | "IMAGE";
  text?: string;
  image?: AppImage;
  color?: string;
};
export type McqContent = SlideContent & {
  options?: McqOption[];
  correctOptionIds?: string[];
  pointValue?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";
  explanation?: string;
  shuffle?: boolean;
  maxSelections?: number;
};
export type SlideContent = {
  contentType: "MCQ";
} & McqContent;
export type SlideResponse = {
  id: string;
  title?: string;
  styledTitle?: {
    [key: string]: any;
  };
  section?: string;
  slideType?:
    | "MCQ"
    | "DRAWING"
    | "GRID"
    | "MATCHING"
    | "NUMBER"
    | "PLACE_ON_IMAGE"
    | "Q_AND_A"
    | "RANKING"
    | "SCALES"
    | "TEXT"
    | "ALLOCATION"
    | "TITLE"
    | "MEDIA"
    | "FOLLOW_UP";
  backgroundImage?: AppImage;
  coverImage?: AppImage;
  createdByUserId: string;
  lastEditedByUserId: string;
  parentId?: string;
  childId?: string;
  version?: number;
  sortOrder?: string;
  content?: SlideContent;
};
export type SlideRequest = {
  id?: string;
  title?: string;
  styledTitle?: {
    [key: string]: any;
  };
  section?: string;
  slideType?:
    | "MCQ"
    | "DRAWING"
    | "GRID"
    | "MATCHING"
    | "NUMBER"
    | "PLACE_ON_IMAGE"
    | "Q_AND_A"
    | "RANKING"
    | "SCALES"
    | "TEXT"
    | "ALLOCATION"
    | "TITLE"
    | "MEDIA"
    | "FOLLOW_UP";
  backgroundImage?: AppImage;
  coverImage?: AppImage;
  parentId?: string;
  childId?: string;
  sortOrder?: string;
  content?: SlideContent;
};
export type ShareDeckRequest = {
  role: "VIEWER" | "EDITOR";
};
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
export type AvatarSelection = {
  externalSrc?: string;
  internalAvatarId?: string;
};
export type UpdateProfileRequest = {
  displayName?: string;
  timezone?: string;
  avatar?: AvatarSelection;
};
export type MoveSlideRequest = {
  to: number;
};
export type PageMetadata = {
  size?: number;
  number?: number;
  totalElements?: number;
  totalPages?: number;
};
export type PagedModelDeckResponse = {
  content?: DeckResponse[];
  page?: PageMetadata;
};
export type Pageable = {
  page?: number;
  size?: number;
  sort?: string[];
};
export type UsernameAvailabilityResponse = {
  username?: string;
  available?: boolean;
};
export const {
  useUpdatePreferencesMutation,
  useGetThemeQuery,
  useLazyGetThemeQuery,
  useCreateMutation,
  useDeleteThemeMutation,
  useUpdateThemeMutation,
  useGetDeckQuery,
  useLazyGetDeckQuery,
  useCreate1Mutation,
  useDeleteDeckMutation,
  useUpdateDeckMutation,
  useSetVisibilityMutation,
  useGetSlideQuery,
  useLazyGetSlideQuery,
  useUpdateSlideMutation,
  useRemoveSlideMutation,
  useShareMutation,
  useRevokeShareMutation,
  useListSlidesQuery,
  useLazyListSlidesQuery,
  useAddSlideMutation,
  useRegisterMutation,
  useRefreshMutation,
  useLogoutMutation,
  useCreateGuestMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useUpdateMeMutation,
  useMoveSlideMutation,
  useListForOrgQuery,
  useLazyListForOrgQuery,
  useListMineQuery,
  useLazyListMineQuery,
  useListBuiltInQuery,
  useLazyListBuiltInQuery,
  useListForOrg1Query,
  useLazyListForOrg1Query,
  useListPublicQuery,
  useLazyListPublicQuery,
  useListMine1Query,
  useLazyListMine1Query,
  useUsernameAvailableQuery,
  useLazyUsernameAvailableQuery,
  useMeQuery,
  useLazyMeQuery,
} = injectedRtkApi;
