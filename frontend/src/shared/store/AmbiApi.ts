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
    listSlideCommentThreads: build.query<
      ListSlideCommentThreadsApiResponse,
      ListSlideCommentThreadsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.deckId}/slides/${queryArg.slideId}/comment-threads`,
        params: {
          pageable: queryArg.pageable,
        },
      }),
    }),
    createCommentThread: build.mutation<
      CreateCommentThreadApiResponse,
      CreateCommentThreadApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.deckId}/slides/${queryArg.slideId}/comment-threads`,
        method: "POST",
        body: queryArg.commentBodyRequest,
      }),
    }),
    addThreadComment: build.mutation<
      AddThreadCommentApiResponse,
      AddThreadCommentApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.deckId}/slides/${queryArg.slideId}/comment-threads/${queryArg.threadId}/comments`,
        method: "POST",
        body: queryArg.commentBodyRequest,
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
    moveSlide: build.mutation<MoveSlideApiResponse, MoveSlideApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/slides/${queryArg.slideId}/move`,
        method: "PATCH",
        body: queryArg.moveSlideRequest,
      }),
    }),
    setThreadStatus: build.mutation<
      SetThreadStatusApiResponse,
      SetThreadStatusApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.deckId}/slides/${queryArg.slideId}/comment-threads/${queryArg.threadId}`,
        method: "PATCH",
        body: queryArg.setThreadStatusRequest,
      }),
    }),
    deleteThreadComment: build.mutation<
      DeleteThreadCommentApiResponse,
      DeleteThreadCommentApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.deckId}/slides/${queryArg.slideId}/comment-threads/${queryArg.threadId}/comments/${queryArg.commentId}`,
        method: "DELETE",
      }),
    }),
    updateThreadComment: build.mutation<
      UpdateThreadCommentApiResponse,
      UpdateThreadCommentApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.deckId}/slides/${queryArg.slideId}/comment-threads/${queryArg.threadId}/comments/${queryArg.commentId}`,
        method: "PATCH",
        body: queryArg.commentBodyRequest,
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
    listMyOrgs: build.query<ListMyOrgsApiResponse, ListMyOrgsApiArg>({
      query: () => ({ url: `/api/orgs/mine` }),
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
export type ListDeckSlidesApiResponse = /** status 200 OK */ SlideResponse[];
export type ListDeckSlidesApiArg = {
  id: string;
};
export type AddSlideApiResponse = /** status 201 Created */ SlideResponse;
export type AddSlideApiArg = {
  id: string;
  slideRequest: SlideRequest;
};
export type ListSlideCommentThreadsApiResponse =
  /** status 200 OK */ PagedModelCommentThreadResponse;
export type ListSlideCommentThreadsApiArg = {
  deckId: string;
  slideId: string;
  pageable: Pageable;
};
export type CreateCommentThreadApiResponse =
  /** status 201 Created */ CommentThreadResponse;
export type CreateCommentThreadApiArg = {
  deckId: string;
  slideId: string;
  commentBodyRequest: CommentBodyRequest;
};
export type AddThreadCommentApiResponse =
  /** status 201 Created */ CommentThreadResponse;
export type AddThreadCommentApiArg = {
  deckId: string;
  slideId: string;
  threadId: string;
  commentBodyRequest: CommentBodyRequest;
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
export type MoveSlideApiResponse = /** status 200 OK */ SlideResponse[];
export type MoveSlideApiArg = {
  id: string;
  slideId: string;
  moveSlideRequest: MoveSlideRequest;
};
export type SetThreadStatusApiResponse =
  /** status 200 OK */ CommentThreadResponse;
export type SetThreadStatusApiArg = {
  deckId: string;
  slideId: string;
  threadId: string;
  setThreadStatusRequest: SetThreadStatusRequest;
};
export type DeleteThreadCommentApiResponse =
  /** status 200 OK */ CommentThreadResponse;
export type DeleteThreadCommentApiArg = {
  deckId: string;
  slideId: string;
  threadId: string;
  commentId: string;
};
export type UpdateThreadCommentApiResponse =
  /** status 200 OK */ CommentThreadResponse;
export type UpdateThreadCommentApiArg = {
  deckId: string;
  slideId: string;
  threadId: string;
  commentId: string;
  commentBodyRequest: CommentBodyRequest;
};
export type ListThemesForOrgApiResponse = /** status 200 OK */ ThemeResponse[];
export type ListThemesForOrgApiArg = {
  orgId: string;
};
export type ListMyThemesApiResponse = /** status 200 OK */ ThemeResponse[];
export type ListMyThemesApiArg = void;
export type ListBuiltInThemesApiResponse = /** status 200 OK */ ThemeResponse[];
export type ListBuiltInThemesApiArg = void;
export type ListMyOrgsApiResponse =
  /** status 200 OK */ MyOrgMembershipResponse[];
export type ListMyOrgsApiArg = void;
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
export type DeckSettings = {
  pointSettings?: PointSettings;
  answerSettings?: AnswerSettings;
  audienceSettings?: AudienceSettings;
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
  contentType: "MCQ";
};
export type NumberContent = {
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
  step: number;
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
export type Target = {
  id?: string;
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
  correctImage?: AppImage;
  canvasWidth: number;
  canvasHeight: number;
  tools: ("PEN" | "ERASER" | "SHAPES" | "TEXT" | "COLOR_PALETTE")[];
  contentType: "DRAWING";
};
export type SubmissionOption = {
  submissionId?: string;
};
export type FollowUpContent = {
  parentSlideId: string;
  submissionOption: SubmissionOption;
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
  contentType: "MEDIA";
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
export type SlideSettings = {
  pointSettings?: PointSettings;
  answerSettings?: AnswerSettings;
};
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
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";
  explanation?: string;
  speakerNotes?: string;
  settings?: SlideSettings;
};
export type SlideRequest = {
  id: string;
  title: string;
  section?: string;
  parentId?: string;
  childId?: string;
  sortOrder?: string;
  content: SlideContent;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";
  explanation?: string;
  speakerNotes?: string;
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
export type AuthorResponse = {
  userId: string;
  name: string;
  pictureUrl?: string;
};
export type CommentResponse = {
  id: string;
  author: AuthorResponse;
  body?: string;
  edited: boolean;
  deleted: boolean;
};
export type CommentThreadResponse = {
  id: string;
  slideId: string;
  status: "OPEN" | "RESOLVED";
  comments: CommentResponse[];
};
export type PagedModelCommentThreadResponse = {
  content?: CommentThreadResponse[];
  page?: PageMetadata;
};
export type CommentBodyRequest = {
  body: string;
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
export type MoveSlideRequest = {
  to: number;
};
export type SetThreadStatusRequest = {
  status: "OPEN" | "RESOLVED";
};
export type MyOrgMembershipResponse = {
  orgId: string;
  role: "OWNER" | "ADMIN" | "USER";
};
export type PagedModelDeckResponse = {
  content?: DeckResponse[];
  page?: PageMetadata;
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
  useGetSlideAnswerSettingsQuery,
  useLazyGetSlideAnswerSettingsQuery,
  useSetSlideAnswerSettingsMutation,
  useClearSlideAnswerSettingsMutation,
  useShareDeckMutation,
  useRevokeShareDeckMutation,
  useSetDeckCoverImageMutation,
  useClearDeckCoverImageMutation,
  useSetDeckBackgroundImageMutation,
  useClearDeckBackgroundImageMutation,
  useListImagesQuery,
  useLazyListImagesQuery,
  useAddImageMutation,
  useListDeckSlidesQuery,
  useLazyListDeckSlidesQuery,
  useAddSlideMutation,
  useListSlideCommentThreadsQuery,
  useLazyListSlideCommentThreadsQuery,
  useCreateCommentThreadMutation,
  useAddThreadCommentMutation,
  useRegisterMutation,
  useRefreshMutation,
  useLogoutMutation,
  useCreateGuestMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useUpdateMeMutation,
  useGetGalleryQuery,
  useLazyGetGalleryQuery,
  useDeleteGalleryMutation,
  useRenameGalleryMutation,
  useMoveSlideMutation,
  useSetThreadStatusMutation,
  useDeleteThreadCommentMutation,
  useUpdateThreadCommentMutation,
  useListThemesForOrgQuery,
  useLazyListThemesForOrgQuery,
  useListMyThemesQuery,
  useLazyListMyThemesQuery,
  useListBuiltInThemesQuery,
  useLazyListBuiltInThemesQuery,
  useListMyOrgsQuery,
  useLazyListMyOrgsQuery,
  useGetOrgGalleryQuery,
  useLazyGetOrgGalleryQuery,
  useGetImageQuery,
  useLazyGetImageQuery,
  useRemoveImageMutation,
  useGetMyGalleryQuery,
  useLazyGetMyGalleryQuery,
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
