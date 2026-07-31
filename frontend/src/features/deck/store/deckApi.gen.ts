import { emptySplitApi as api } from "../../../shared/store/emptyApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
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
    setDeckTags: build.mutation<SetDeckTagsApiResponse, SetDeckTagsApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/tags`,
        method: "PUT",
        body: queryArg.setTagsRequest,
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
    getSlidePointSettings: build.query<
      GetSlidePointSettingsApiResponse,
      GetSlidePointSettingsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}/point-settings`,
      }),
    }),
    setSlidePointSettings: build.mutation<
      SetSlidePointSettingsApiResponse,
      SetSlidePointSettingsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}/point-settings`,
        method: "PUT",
        body: queryArg.setPointSettingsRequest,
      }),
    }),
    clearSlidePointSettings: build.mutation<
      ClearSlidePointSettingsApiResponse,
      ClearSlidePointSettingsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}/point-settings`,
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
    hideSlideBackground: build.mutation<
      HideSlideBackgroundApiResponse,
      HideSlideBackgroundApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}/background-image/hide`,
        method: "PUT",
      }),
    }),
    setSlideBackgroundColor: build.mutation<
      SetSlideBackgroundColorApiResponse,
      SetSlideBackgroundColorApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}/background-color`,
        method: "PUT",
        body: queryArg.setColorRequest,
      }),
    }),
    clearSlideBackgroundColor: build.mutation<
      ClearSlideBackgroundColorApiResponse,
      ClearSlideBackgroundColorApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}/background-color`,
        method: "DELETE",
      }),
    }),
    getSlideAnswerSettings: build.query<
      GetSlideAnswerSettingsApiResponse,
      GetSlideAnswerSettingsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}/answer-settings`,
      }),
    }),
    setSlideAnswerSettings: build.mutation<
      SetSlideAnswerSettingsApiResponse,
      SetSlideAnswerSettingsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}/answer-settings`,
        method: "PUT",
        body: queryArg.setAnswerSettingsRequest,
      }),
    }),
    clearSlideAnswerSettings: build.mutation<
      ClearSlideAnswerSettingsApiResponse,
      ClearSlideAnswerSettingsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}/answer-settings`,
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
    setDeckPointSettings: build.mutation<
      SetDeckPointSettingsApiResponse,
      SetDeckPointSettingsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/point-settings`,
        method: "PUT",
        body: queryArg.setPointSettingsRequest,
      }),
    }),
    promotePointSettingsToDeck: build.mutation<
      PromotePointSettingsToDeckApiResponse,
      PromotePointSettingsToDeckApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/point-settings/promote`,
        method: "PUT",
        body: queryArg.setPointSettingsRequest,
      }),
    }),
    setDeckInviteSettings: build.mutation<
      SetDeckInviteSettingsApiResponse,
      SetDeckInviteSettingsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/invite-settings`,
        method: "PUT",
        body: queryArg.setInviteSettingsRequest,
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
    promoteBackgroundImageToDeck: build.mutation<
      PromoteBackgroundImageToDeckApiResponse,
      PromoteBackgroundImageToDeckApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/background-image/promote`,
        method: "PUT",
        body: queryArg.setImageRequest,
      }),
    }),
    promoteClearedBackgroundImageToDeck: build.mutation<
      PromoteClearedBackgroundImageToDeckApiResponse,
      PromoteClearedBackgroundImageToDeckApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/background-image/promote`,
        method: "DELETE",
      }),
    }),
    setDeckBackgroundColor: build.mutation<
      SetDeckBackgroundColorApiResponse,
      SetDeckBackgroundColorApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/background-color`,
        method: "PUT",
        body: queryArg.setColorRequest,
      }),
    }),
    clearDeckBackgroundColor: build.mutation<
      ClearDeckBackgroundColorApiResponse,
      ClearDeckBackgroundColorApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/background-color`,
        method: "DELETE",
      }),
    }),
    promoteBackgroundColorToDeck: build.mutation<
      PromoteBackgroundColorToDeckApiResponse,
      PromoteBackgroundColorToDeckApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/background-color/promote`,
        method: "PUT",
        body: queryArg.setColorRequest,
      }),
    }),
    promoteClearedBackgroundColorToDeck: build.mutation<
      PromoteClearedBackgroundColorToDeckApiResponse,
      PromoteClearedBackgroundColorToDeckApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/background-color/promote`,
        method: "DELETE",
      }),
    }),
    setDeckAudienceSettings: build.mutation<
      SetDeckAudienceSettingsApiResponse,
      SetDeckAudienceSettingsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/audience-settings`,
        method: "PUT",
        body: queryArg.setAudienceSettingsRequest,
      }),
    }),
    setDeckAnswerSettings: build.mutation<
      SetDeckAnswerSettingsApiResponse,
      SetDeckAnswerSettingsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/answer-settings`,
        method: "PUT",
        body: queryArg.setAnswerSettingsRequest,
      }),
    }),
    promoteAnswerSettingsToDeck: build.mutation<
      PromoteAnswerSettingsToDeckApiResponse,
      PromoteAnswerSettingsToDeckApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/answer-settings/promote`,
        method: "PUT",
        body: queryArg.setAnswerSettingsRequest,
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
    addFollowUpSlide: build.mutation<
      AddFollowUpSlideApiResponse,
      AddFollowUpSlideApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}/follow-up`,
        method: "POST",
        body: queryArg.addFollowUpRequest,
      }),
    }),
    moveSlide: build.mutation<MoveSlideApiResponse, MoveSlideApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}/move`,
        method: "PATCH",
        body: queryArg.moveSlideRequest,
      }),
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
  }),
  overrideExisting: false,
});
export { injectedRtkApi as deckApi };
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
export type SetDeckTagsApiResponse = /** status 200 OK */ DeckResponse;
export type SetDeckTagsApiArg = {
  id: string;
  setTagsRequest: SetTagsRequest;
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
export type GetSlidePointSettingsApiResponse =
  /** status 200 OK */ PointSettingsResponse;
export type GetSlidePointSettingsApiArg = {
  id: string;
  slideId: string;
};
export type SetSlidePointSettingsApiResponse =
  /** status 200 OK */ PointSettingsResponse;
export type SetSlidePointSettingsApiArg = {
  id: string;
  slideId: string;
  setPointSettingsRequest: SetPointSettingsRequest;
};
export type ClearSlidePointSettingsApiResponse =
  /** status 200 OK */ PointSettingsResponse;
export type ClearSlidePointSettingsApiArg = {
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
export type HideSlideBackgroundApiResponse = /** status 200 OK */ SlideResponse;
export type HideSlideBackgroundApiArg = {
  id: string;
  slideId: string;
};
export type SetSlideBackgroundColorApiResponse =
  /** status 200 OK */ SlideResponse;
export type SetSlideBackgroundColorApiArg = {
  id: string;
  slideId: string;
  setColorRequest: SetColorRequest;
};
export type ClearSlideBackgroundColorApiResponse =
  /** status 200 OK */ SlideResponse;
export type ClearSlideBackgroundColorApiArg = {
  id: string;
  slideId: string;
};
export type GetSlideAnswerSettingsApiResponse =
  /** status 200 OK */ AnswerSettingsResponse;
export type GetSlideAnswerSettingsApiArg = {
  id: string;
  slideId: string;
};
export type SetSlideAnswerSettingsApiResponse =
  /** status 200 OK */ AnswerSettingsResponse;
export type SetSlideAnswerSettingsApiArg = {
  id: string;
  slideId: string;
  setAnswerSettingsRequest: SetAnswerSettingsRequest;
};
export type ClearSlideAnswerSettingsApiResponse =
  /** status 200 OK */ AnswerSettingsResponse;
export type ClearSlideAnswerSettingsApiArg = {
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
export type SetDeckPointSettingsApiResponse = /** status 200 OK */ DeckResponse;
export type SetDeckPointSettingsApiArg = {
  id: string;
  setPointSettingsRequest: SetPointSettingsRequest;
};
export type PromotePointSettingsToDeckApiResponse =
  /** status 200 OK */ DeckResponse;
export type PromotePointSettingsToDeckApiArg = {
  id: string;
  setPointSettingsRequest: SetPointSettingsRequest;
};
export type SetDeckInviteSettingsApiResponse =
  /** status 200 OK */ DeckResponse;
export type SetDeckInviteSettingsApiArg = {
  id: string;
  setInviteSettingsRequest: SetInviteSettingsRequest;
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
export type PromoteBackgroundImageToDeckApiResponse =
  /** status 200 OK */ DeckResponse;
export type PromoteBackgroundImageToDeckApiArg = {
  id: string;
  setImageRequest: SetImageRequest;
};
export type PromoteClearedBackgroundImageToDeckApiResponse =
  /** status 200 OK */ DeckResponse;
export type PromoteClearedBackgroundImageToDeckApiArg = {
  id: string;
};
export type SetDeckBackgroundColorApiResponse =
  /** status 200 OK */ DeckResponse;
export type SetDeckBackgroundColorApiArg = {
  id: string;
  setColorRequest: SetColorRequest;
};
export type ClearDeckBackgroundColorApiResponse =
  /** status 200 OK */ DeckResponse;
export type ClearDeckBackgroundColorApiArg = {
  id: string;
};
export type PromoteBackgroundColorToDeckApiResponse =
  /** status 200 OK */ DeckResponse;
export type PromoteBackgroundColorToDeckApiArg = {
  id: string;
  setColorRequest: SetColorRequest;
};
export type PromoteClearedBackgroundColorToDeckApiResponse =
  /** status 200 OK */ DeckResponse;
export type PromoteClearedBackgroundColorToDeckApiArg = {
  id: string;
};
export type SetDeckAudienceSettingsApiResponse =
  /** status 200 OK */ DeckResponse;
export type SetDeckAudienceSettingsApiArg = {
  id: string;
  setAudienceSettingsRequest: SetAudienceSettingsRequest;
};
export type SetDeckAnswerSettingsApiResponse =
  /** status 200 OK */ DeckResponse;
export type SetDeckAnswerSettingsApiArg = {
  id: string;
  setAnswerSettingsRequest: SetAnswerSettingsRequest;
};
export type PromoteAnswerSettingsToDeckApiResponse =
  /** status 200 OK */ DeckResponse;
export type PromoteAnswerSettingsToDeckApiArg = {
  id: string;
  setAnswerSettingsRequest: SetAnswerSettingsRequest;
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
export type AddFollowUpSlideApiResponse =
  /** status 201 Created */ SlideResponse[];
export type AddFollowUpSlideApiArg = {
  id: string;
  slideId: string;
  addFollowUpRequest: AddFollowUpRequest;
};
export type MoveSlideApiResponse = /** status 200 OK */ SlideResponse[];
export type MoveSlideApiArg = {
  id: string;
  slideId: string;
  moveSlideRequest: MoveSlideRequest;
};
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
export type PointSettings = {
  points?: number;
  deceptionPoints?: number;
  bestAnswerPoints?: number;
  fastestCorrectAnswerPoints?: number;
  streakBonuses?: {
    [key: string]: number;
  };
  resetStreakOnStreakEnd?: boolean;
};
export type AnswerSettings = {
  displayResultsMode?:
    | "IMMEDIATE"
    | "ROUND_END"
    | "PRESENTATION_END"
    | "MANUAL"
    | "AFTER_FOLLOWUP"
    | "NEVER";
  displayResultsAsPercentage?: boolean;
  shuffleOptions?: boolean;
  anonymizeAnswers?: boolean;
  countdownTime?: number;
  allowAnonymous?: boolean;
  maxSelections?: number;
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
export type InviteSettings = {
  showRoomCodeInHeader?: boolean;
  showJoinInfoInResults?: boolean;
};
export type DeckSettings = {
  pointSettings?: PointSettings;
  answerSettings?: AnswerSettings;
  audienceSettings?: AudienceSettings;
  inviteSettings?: InviteSettings;
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
export type ViewerPermissions = {
  canView: boolean;
  canEdit: boolean;
  canManage: boolean;
};
export type DeckResponse = {
  id: string;
  publicId: string;
  name: string;
  label?: string;
  description?: string;
  coverImage?: AppImage;
  backgroundImage?: AppImage;
  backgroundColor?: string;
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
  label?: string;
  description?: string;
  themeId?: string;
  language?: string;
  publishStatus?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};
export type SetVisibilityRequest = {
  visibility: "PRIVATE" | "UNLISTED" | "ORG" | "PUBLIC";
};
export type SetTagsRequest = {
  tags: string[];
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
  dataVisualization:
    | "PIE"
    | "BAR_HORIZONTAL"
    | "BAR_VERTICAL"
    | "LINE"
    | "DONUT"
    | "PARETO"
    | "DOT"
    | "NONE";
  contentType: "MCQ";
};
export type NumberContent = {
  answer?: number | null;
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
  contentType: "NUMBER";
};
export type TextContent = {
  acceptedAnswers: string[];
  matchMode: "EXACT" | "CONTAINS" | "WORDCLOUD";
  caseSensitive: boolean;
  trimWhitespace: boolean;
  maxLength?: number;
  contentType: "TEXT";
};
export type RankItem = {
  id?: string;
  label?: string;
  image?: AppImage;
  color?: string;
};
export type RankingContent = {
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
  contentType: "RANKING";
};
export type ScaleItem = {
  id?: string;
  label?: string;
};
export type ScalesContent = {
  min: number;
  max: number;
  leftLabel: string;
  rightLabel: string;
  items: ScaleItem[];
  correctValues: {
    [key: string]: number;
  };
  tolerance: number;
  contentType: "SCALES";
};
export type GridItem = {
  id?: string;
  label?: string;
  image?: AppImage;
  color?: string;
};
export type GridContent = {
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
  contentType: "GRID";
};
export type AxisItem = {
  id?: string;
  label?: string;
  image?: AppImage;
  color?: string;
};
export type AxisPoint = {
  x: number;
  y: number;
};
export type AxisContent = {
  xLowLabel: string;
  xHighLabel: string;
  yLowLabel: string;
  yHighLabel: string;
  items: AxisItem[];
  correctPositions: {
    [key: string]: AxisPoint;
  };
  tolerance: number;
  scoreMode:
    | "EXACT"
    | "PARTIAL"
    | "RANGE"
    | "CLOSEST"
    | "INSIDE_RADIUS"
    | "NEAREST"
    | "DISTANCE";
  contentType: "AXIS";
};
export type Target = {
  id?: string;
  label?: string;
  image?: AppImage;
  color?: string;
  x?: number;
  y?: number;
  radius?: number;
};
export type PlaceOnImageContent = {
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
  contentType: "PLACE_ON_IMAGE";
};
export type MatchItem = {
  id?: string;
  label?: string;
  image?: AppImage;
  color?: string;
};
export type MatchingContent = {
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
  contentType: "MATCHING";
};
export type AllocationContent = {
  options: McqOption[];
  correctAllocations?: {
    [key: string]: number;
  };
  totalPointsToAllocate: number;
  tolerancePerOption: number;
  contentType: "ALLOCATION";
};
export type DrawingContent = {
  imagePrompt?: AppImage;
  promptPlacement: "ALONGSIDE" | "BACKGROUND";
  correctImage?: AppImage;
  palette: string[];
  tools: ("PEN" | "ERASER" | "SHAPES" | "TEXT" | "COLOR_PALETTE")[];
  contentType: "DRAWING";
};
export type FollowUpContent = {
  mode: "BEST_ANSWER_VOTE" | "PREDICT_POPULAR" | "SPOT_THE_ANSWER";
  contentType: "FOLLOW_UP";
};
export type TitleContent = {
  subtitle?: string;
  contentType: "TITLE";
};
export type RichTextContent = {
  body?: string;
  horizontalAlign?: "LEFT" | "CENTER" | "RIGHT";
  verticalAlign?: "TOP" | "MIDDLE" | "BOTTOM";
  contentType: "CONTENT";
};
export type MediaContent = {
  mediaType?: "IMAGE" | "VIDEO" | "EMBED";
  image?: AppImage;
  url?: string;
  caption?: string;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  contentType: "MEDIA";
};
export type InstructionContent = {
  heading?: string;
  body?: string;
  contentType: "INSTRUCTION";
};
export type QAndAContent = {
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
      contentType: "AXIS";
    } & AxisContent)
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
      contentType: "CONTENT";
    } & RichTextContent)
  | ({
      contentType: "MEDIA";
    } & MediaContent)
  | ({
      contentType: "INSTRUCTION";
    } & InstructionContent)
  | ({
      contentType: "Q_AND_A";
    } & QAndAContent);
export type SlideSettings = {
  pointSettings?: PointSettings;
  answerSettings?: AnswerSettings;
};
export type SlideResponse = {
  id: string;
  title: string;
  section?: string;
  backgroundImage?: AppImage;
  hideBackground?: boolean;
  backgroundColor?: string;
  coverImage?: AppImage;
  createdByUserId: string;
  lastEditedByUserId: string;
  parentId?: string;
  childId?: string;
  version?: number;
  sortOrder?: string;
  content: SlideContent;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";
  explanation?: string;
  speakerNotes?: string;
  participantInstructions?: string;
  settings?: SlideSettings;
};
export type SlideRequest = {
  id: string;
  title: string;
  section?: string;
  sortOrder?: string;
  content: SlideContent;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";
  explanation?: string;
  speakerNotes?: string;
  participantInstructions?: string;
};
export type PointSettingsResponse = {
  slideId: string;
  pointSettings?: PointSettings;
};
export type SetPointSettingsRequest = {
  pointSettings: PointSettings;
};
export type SetImageRequest = {
  image: AppImage;
};
export type SetColorRequest = {
  color: string;
};
export type AnswerSettingsResponse = {
  slideId: string;
  answerSettings?: AnswerSettings;
};
export type SetAnswerSettingsRequest = {
  answerSettings: AnswerSettings;
};
export type ShareDeckRequest = {
  role: "VIEWER" | "EDITOR";
};
export type SetInviteSettingsRequest = {
  inviteSettings: InviteSettings;
};
export type SetAudienceSettingsRequest = {
  audienceSettings: AudienceSettings;
};
export type AddFollowUpRequest = {
  id: string;
  mode: "BEST_ANSWER_VOTE" | "PREDICT_POPULAR" | "SPOT_THE_ANSWER";
  title?: string;
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
export const {
  useGetDeckQuery,
  useLazyGetDeckQuery,
  useCreateDeckMutation,
  useDeleteDeckMutation,
  useUpdateDeckMutation,
  useSetDeckVisibilityMutation,
  useSetDeckTagsMutation,
  useGetSlideQuery,
  useLazyGetSlideQuery,
  useUpdateSlideMutation,
  useRemoveSlideMutation,
  useGetSlidePointSettingsQuery,
  useLazyGetSlidePointSettingsQuery,
  useSetSlidePointSettingsMutation,
  useClearSlidePointSettingsMutation,
  useSetSlideCoverImageMutation,
  useClearSlideCoverImageMutation,
  useSetSlideBackgroundImageMutation,
  useClearSlideBackgroundImageMutation,
  useHideSlideBackgroundMutation,
  useSetSlideBackgroundColorMutation,
  useClearSlideBackgroundColorMutation,
  useGetSlideAnswerSettingsQuery,
  useLazyGetSlideAnswerSettingsQuery,
  useSetSlideAnswerSettingsMutation,
  useClearSlideAnswerSettingsMutation,
  useShareDeckMutation,
  useRevokeShareDeckMutation,
  useSetDeckPointSettingsMutation,
  usePromotePointSettingsToDeckMutation,
  useSetDeckInviteSettingsMutation,
  useSetDeckCoverImageMutation,
  useClearDeckCoverImageMutation,
  useSetDeckBackgroundImageMutation,
  useClearDeckBackgroundImageMutation,
  usePromoteBackgroundImageToDeckMutation,
  usePromoteClearedBackgroundImageToDeckMutation,
  useSetDeckBackgroundColorMutation,
  useClearDeckBackgroundColorMutation,
  usePromoteBackgroundColorToDeckMutation,
  usePromoteClearedBackgroundColorToDeckMutation,
  useSetDeckAudienceSettingsMutation,
  useSetDeckAnswerSettingsMutation,
  usePromoteAnswerSettingsToDeckMutation,
  useListDeckSlidesQuery,
  useLazyListDeckSlidesQuery,
  useAddSlideMutation,
  useAddFollowUpSlideMutation,
  useMoveSlideMutation,
  useListDecksForOrgQuery,
  useLazyListDecksForOrgQuery,
  useListPublicDecksQuery,
  useLazyListPublicDecksQuery,
  useListMyDecksQuery,
  useLazyListMyDecksQuery,
} = injectedRtkApi;
