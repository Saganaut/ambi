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
    getDeck: build.query<GetDeckApiResponse, GetDeckApiArg>({
      query: (queryArg) => ({ url: `/api/decks/${queryArg.id}` }),
    }),
    createDeck: build.mutation<CreateDeckApiResponse, CreateDeckApiArg>({
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
    setDeckVisibility: build.mutation<
      SetDeckVisibilityApiResponse,
      SetDeckVisibilityApiArg
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
    setSlideCoverImage: build.mutation<
      SetSlideCoverImageApiResponse,
      SetSlideCoverImageApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}/cover-image`,
        method: "PUT",
        body: queryArg.setImageRequest,
      }),
    }),
    clearSlideCoverImage: build.mutation<
      ClearSlideCoverImageApiResponse,
      ClearSlideCoverImageApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}/cover-image`,
        method: "DELETE",
      }),
    }),
    setSlideBackgroundImage: build.mutation<
      SetSlideBackgroundImageApiResponse,
      SetSlideBackgroundImageApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}/background-image`,
        method: "PUT",
        body: queryArg.setImageRequest,
      }),
    }),
    clearSlideBackgroundImage: build.mutation<
      ClearSlideBackgroundImageApiResponse,
      ClearSlideBackgroundImageApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}/background-image`,
        method: "DELETE",
      }),
    }),
    shareDeck: build.mutation<ShareDeckApiResponse, ShareDeckApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/shares/${queryArg.userId}`,
        method: "PUT",
        body: queryArg.shareDeckRequest,
      }),
    }),
    revokeShareDeck: build.mutation<
      RevokeShareDeckApiResponse,
      RevokeShareDeckApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/shares/${queryArg.userId}`,
        method: "DELETE",
      }),
    }),
    setDeckCoverImage: build.mutation<
      SetDeckCoverImageApiResponse,
      SetDeckCoverImageApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/cover-image`,
        method: "PUT",
        body: queryArg.setImageRequest,
      }),
    }),
    clearDeckCoverImage: build.mutation<
      ClearDeckCoverImageApiResponse,
      ClearDeckCoverImageApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/cover-image`,
        method: "DELETE",
      }),
    }),
    setDeckBackgroundImage: build.mutation<
      SetDeckBackgroundImageApiResponse,
      SetDeckBackgroundImageApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/background-image`,
        method: "PUT",
        body: queryArg.setImageRequest,
      }),
    }),
    clearDeckBackgroundImage: build.mutation<
      ClearDeckBackgroundImageApiResponse,
      ClearDeckBackgroundImageApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/background-image`,
        method: "DELETE",
      }),
    }),
    listDeckSlides: build.query<
      ListDeckSlidesApiResponse,
      ListDeckSlidesApiArg
    >({
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
    listDecksForOrg: build.query<
      ListDecksForOrgApiResponse,
      ListDecksForOrgApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks`,
        params: {
          orgId: queryArg.orgId,
        },
      }),
    }),
    listPublicDecks: build.query<
      ListPublicDecksApiResponse,
      ListPublicDecksApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/public`,
        params: {
          pageable: queryArg.pageable,
        },
      }),
    }),
    listMyDecks: build.query<ListMyDecksApiResponse, ListMyDecksApiArg>({
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
export type GetDeckApiResponse = /** status 200 OK */ DeckResponse;
export type GetDeckApiArg = {
  id: string;
};
export type CreateDeckApiResponse = /** status 200 OK */ DeckResponse;
export type CreateDeckApiArg = {
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
export type SetDeckVisibilityApiResponse = /** status 200 OK */ DeckResponse;
export type SetDeckVisibilityApiArg = {
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
export type SetSlideCoverImageApiResponse = /** status 200 OK */ SlideResponse;
export type SetSlideCoverImageApiArg = {
  id: string;
  slideId: string;
  setImageRequest: SetImageRequest;
};
export type ClearSlideCoverImageApiResponse =
  /** status 200 OK */ SlideResponse;
export type ClearSlideCoverImageApiArg = {
  id: string;
  slideId: string;
};
export type SetSlideBackgroundImageApiResponse =
  /** status 200 OK */ SlideResponse;
export type SetSlideBackgroundImageApiArg = {
  id: string;
  slideId: string;
  setImageRequest: SetImageRequest;
};
export type ClearSlideBackgroundImageApiResponse =
  /** status 200 OK */ SlideResponse;
export type ClearSlideBackgroundImageApiArg = {
  id: string;
  slideId: string;
};
export type ShareDeckApiResponse = /** status 200 OK */ DeckResponse;
export type ShareDeckApiArg = {
  id: string;
  userId: string;
  shareDeckRequest: ShareDeckRequest;
};
export type RevokeShareDeckApiResponse = /** status 200 OK */ DeckResponse;
export type RevokeShareDeckApiArg = {
  id: string;
  userId: string;
};
export type SetDeckCoverImageApiResponse = /** status 200 OK */ DeckResponse;
export type SetDeckCoverImageApiArg = {
  id: string;
  setImageRequest: SetImageRequest;
};
export type ClearDeckCoverImageApiResponse = /** status 200 OK */ DeckResponse;
export type ClearDeckCoverImageApiArg = {
  id: string;
};
export type SetDeckBackgroundImageApiResponse =
  /** status 200 OK */ DeckResponse;
export type SetDeckBackgroundImageApiArg = {
  id: string;
  setImageRequest: SetImageRequest;
};
export type ClearDeckBackgroundImageApiResponse =
  /** status 200 OK */ DeckResponse;
export type ClearDeckBackgroundImageApiArg = {
  id: string;
};
export type ListDeckSlidesApiResponse = /** status 200 OK */ SlideResponse[];
export type ListDeckSlidesApiArg = {
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
export type ListThemesForOrgApiResponse = /** status 200 OK */ ThemeResponse[];
export type ListThemesForOrgApiArg = {
  orgId: string;
};
export type ListMyThemesApiResponse = /** status 200 OK */ ThemeResponse[];
export type ListMyThemesApiArg = void;
export type ListBuiltInThemesApiResponse = /** status 200 OK */ ThemeResponse[];
export type ListBuiltInThemesApiArg = void;
export type ListDecksForOrgApiResponse = /** status 200 OK */ DeckResponse[];
export type ListDecksForOrgApiArg = {
  orgId: string;
};
export type ListPublicDecksApiResponse =
  /** status 200 OK */ PagedModelDeckResponse;
export type ListPublicDecksApiArg = {
  pageable: Pageable;
};
export type ListMyDecksApiResponse = /** status 200 OK */ DeckResponse[];
export type ListMyDecksApiArg = void;
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
export type Ownership = {
  type?: "USER" | "ORGANIZATION";
  ownerId?: string;
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
export type Ownership = {
  type?: "USER" | "ORGANIZATION";
  ownerId?: string;
};
export type DeckAccessGrant = {
  userId?: string;
  role?: "VIEWER" | "EDITOR";
};
export type DeckStats = {
  playCount: number;
  completedPlayCount: number;
  completionRate: number;
  uniquePlayerCount: number;
  viewCount: number;
  forkCount: number;
  averageScorePercent: number;
  ratingAverage?: number;
  ratingCount: number;
  lastPlayedAt?: string;
  computedAt?: string;
};
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
  ownership: Ownership;
  acl: DeckAccessGrant[];
  parentDeckId?: string;
  stats?: DeckStats;
  createdAt: string;
  updatedAt: string;
  permissions: ViewerPermissions;
};
export type UpdateDeckRequest = {
  name?: string;
  description?: string;
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
  id: string;
  optionType: "TEXT" | "NUMBER" | "IMAGE";
  text?: string;
  image?: AppImage;
  color?: string;
};
export type McqContent = {
  options: McqOption[];
  correctOptionIds: string[];
  pointValue: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";
  explanation?: string;
  shuffle: boolean;
  maxSelections: number;
  allowAnonymous: boolean;
  contentType: "MCQ";
};
export type NumberContent = {
  pointValue: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";
  explanation?: string;
  answer: number;
  scoreMode:
    | "EXACT"
    | "PARTIAL"
    | "RANGE"
    | "CLOSEST"
    | "INSIDE_RADIUS"
    | "NEAREST"
    | "DISTANCE";
  tolerance: number;
  unit: string;
  min: number;
  max: number;
  allowAnonymous: boolean;
  contentType: "NUMBER";
};
export type TextContent = {
  pointValue: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";
  explanation?: string;
  acceptedAnswers: string[];
  matchMode: "EXACT" | "CONTAINS" | "WORDCLOUD";
  caseSensitive: boolean;
  trimWhitespace: boolean;
  maxLength?: number;
  allowAnonymous: boolean;
  contentType: "TEXT";
};
export type RankItem = {
  id?: string;
  label?: string;
  image?: AppImage;
};
export type RankingContent = {
  pointValue: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";
  explanation?: string;
  items: RankItem[];
  correctOrder: string[];
  scoreMode:
    | "EXACT"
    | "PARTIAL"
    | "RANGE"
    | "CLOSEST"
    | "INSIDE_RADIUS"
    | "NEAREST"
    | "DISTANCE";
  allowAnonymous: boolean;
  contentType: "RANKING";
};
export type ScaleItem = {
  id?: string;
  label?: string;
};
export type ScalesContent = {
  pointValue: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";
  explanation?: string;
  min: number;
  max: number;
  step: number;
  leftLabel: string;
  rightLabel: string;
  items: ScaleItem[];
  correctValues: {
    [key: string]: number;
  };
  tolerance: number;
  allowAnonymous: boolean;
  contentType: "SCALES";
};
export type GridItem = {
  id?: string;
  label?: string;
  image?: AppImage;
};
export type GridContent = {
  pointValue: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";
  explanation?: string;
  rowLabels: string[];
  colLabels: string[];
  items: GridItem[];
  correctCells: {
    [key: string]: string;
  };
  scoreMode:
    | "EXACT"
    | "PARTIAL"
    | "RANGE"
    | "CLOSEST"
    | "INSIDE_RADIUS"
    | "NEAREST"
    | "DISTANCE";
  allowAnonymous: boolean;
  contentType: "GRID";
};
export type Target = {
  id?: string;
  x?: number;
  y?: number;
  radius?: number;
};
export type PlaceOnImageContent = {
  pointValue: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";
  explanation?: string;
  image: AppImage;
  correctTargets: Target[];
  scoreMode:
    | "EXACT"
    | "PARTIAL"
    | "RANGE"
    | "CLOSEST"
    | "INSIDE_RADIUS"
    | "NEAREST"
    | "DISTANCE";
  allowAnonymous: boolean;
  contentType: "PLACE_ON_IMAGE";
};
export type MatchItem = {
  id?: string;
  label?: string;
  image?: AppImage;
};
export type MatchingContent = {
  pointValue: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";
  explanation?: string;
  left: MatchItem[];
  right: MatchItem[];
  correctPairs: {
    [key: string]: string;
  };
  scoreMode:
    | "EXACT"
    | "PARTIAL"
    | "RANGE"
    | "CLOSEST"
    | "INSIDE_RADIUS"
    | "NEAREST"
    | "DISTANCE";
  allowAnonymous: boolean;
  contentType: "MATCHING";
};
export type AllocationContent = {
  pointValue: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";
  options: McqOption[];
  correctAllocations?: {
    [key: string]: number;
  };
  totalPointsToAllocate: number;
  tolerancePerOption: number;
  allowAnonymous: boolean;
  explanation?: string;
  contentType: "ALLOCATION";
};
export type DrawingContent = {
  pointValue: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";
  explanation?: string;
  imagePrompt?: AppImage;
  correctImage?: AppImage;
  canvasWidth: number;
  canvasHeight: number;
  tools: ("PEN" | "ERASER" | "SHAPES" | "TEXT" | "COLOR_PALETTE")[];
  allowAnonymous: boolean;
  contentType: "DRAWING";
};
export type SubmissionOption = {
  submissionId?: string;
};
export type FollowUpContent = {
  pointValue: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";
  parentSlideId: string;
  explanation?: string;
  submissionOption: SubmissionOption;
  allowAnonymous: boolean;
  contentType: "FOLLOW_UP";
};
export type TitleContent = {
  contentType: "TITLE";
};
export type MediaContent = {
  mediaType?: "IMAGE" | "VIDEO" | "EMBED";
  image?: AppImage;
  url?: string;
  caption?: string;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  allowAnonymous: boolean;
  contentType: "MEDIA";
};
export type QAndAContent = {
  allowAnonymous: boolean;
  maxResponses?: number;
  moderated: boolean;
  contentType: "Q_AND_A";
};
export type SlideContent =
  | ({
      contentType: "MCQ";
    } & McqContent)
  | ({
      contentType: "NUMBER";
    } & NumberContent)
  | ({
      contentType: "TEXT";
    } & TextContent)
  | ({
      contentType: "RANKING";
    } & RankingContent)
  | ({
      contentType: "SCALES";
    } & ScalesContent)
  | ({
      contentType: "GRID";
    } & GridContent)
  | ({
      contentType: "PLACE_ON_IMAGE";
    } & PlaceOnImageContent)
  | ({
      contentType: "MATCHING";
    } & MatchingContent)
  | ({
      contentType: "ALLOCATION";
    } & AllocationContent)
  | ({
      contentType: "DRAWING";
    } & DrawingContent)
  | ({
      contentType: "FOLLOW_UP";
    } & FollowUpContent)
  | ({
      contentType: "TITLE";
    } & TitleContent)
  | ({
      contentType: "MEDIA";
    } & MediaContent)
  | ({
      contentType: "Q_AND_A";
    } & QAndAContent);
export type SlideResponse = {
  id: string;
  title: string;
  section?: string;
  backgroundImage?: AppImage;
  coverImage?: AppImage;
  createdByUserId: string;
  lastEditedByUserId: string;
  parentId?: string;
  childId?: string;
  version?: number;
  sortOrder?: string;
  content: SlideContent;
  speakerNotes?: string;
};
export type SlideRequest = {
  id: string;
  title: string;
  section?: string;
  parentId?: string;
  childId?: string;
  sortOrder?: string;
  content: SlideContent;
  speakerNotes?: string;
};
export type SetImageRequest = {
  image: AppImage;
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
  useCreateThemeMutation,
  useDeleteThemeMutation,
  useUpdateThemeMutation,
  useGetDeckQuery,
  useLazyGetDeckQuery,
  useCreateDeckMutation,
  useDeleteDeckMutation,
  useUpdateDeckMutation,
  useSetDeckVisibilityMutation,
  useGetSlideQuery,
  useLazyGetSlideQuery,
  useUpdateSlideMutation,
  useRemoveSlideMutation,
  useSetSlideCoverImageMutation,
  useClearSlideCoverImageMutation,
  useSetSlideBackgroundImageMutation,
  useClearSlideBackgroundImageMutation,
  useShareDeckMutation,
  useRevokeShareDeckMutation,
  useSetDeckCoverImageMutation,
  useClearDeckCoverImageMutation,
  useSetDeckBackgroundImageMutation,
  useClearDeckBackgroundImageMutation,
  useListDeckSlidesQuery,
  useLazyListDeckSlidesQuery,
  useAddSlideMutation,
  useRegisterMutation,
  useRefreshMutation,
  useLogoutMutation,
  useCreateGuestMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useUpdateMeMutation,
  useMoveSlideMutation,
  useListThemesForOrgQuery,
  useLazyListThemesForOrgQuery,
  useListMyThemesQuery,
  useLazyListMyThemesQuery,
  useListBuiltInThemesQuery,
  useLazyListBuiltInThemesQuery,
  useListDecksForOrgQuery,
  useLazyListDecksForOrgQuery,
  useListPublicDecksQuery,
  useLazyListPublicDecksQuery,
  useListMyDecksQuery,
  useLazyListMyDecksQuery,
  useUsernameAvailableQuery,
  useLazyUsernameAvailableQuery,
  useMeQuery,
  useLazyMeQuery,
} = injectedRtkApi;
