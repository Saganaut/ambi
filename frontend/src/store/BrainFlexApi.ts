import { emptySplitApi as api } from "./emptyApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    getNotificationPrefs: build.query<
      GetNotificationPrefsApiResponse,
      GetNotificationPrefsApiArg
    >({
      query: () => ({ url: `/api/users/me/notification-prefs` }),
    }),
    updateNotificationPrefs: build.mutation<
      UpdateNotificationPrefsApiResponse,
      UpdateNotificationPrefsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/users/me/notification-prefs`,
        method: "PUT",
        body: queryArg.notificationPrefs,
      }),
    }),
    updateTheme: build.mutation<UpdateThemeApiResponse, UpdateThemeApiArg>({
      query: (queryArg) => ({
        url: `/api/themes/${queryArg.id}`,
        method: "PUT",
        body: queryArg.updateThemeRequest,
      }),
    }),
    deleteTheme: build.mutation<DeleteThemeApiResponse, DeleteThemeApiArg>({
      query: (queryArg) => ({
        url: `/api/themes/${queryArg.id}`,
        method: "DELETE",
      }),
    }),
    getTag: build.query<GetTagApiResponse, GetTagApiArg>({
      query: (queryArg) => ({ url: `/api/tags/${queryArg.id}` }),
    }),
    updateTag: build.mutation<UpdateTagApiResponse, UpdateTagApiArg>({
      query: (queryArg) => ({
        url: `/api/tags/${queryArg.id}`,
        method: "PUT",
        body: queryArg.updateTagRequest,
      }),
    }),
    deleteTag: build.mutation<DeleteTagApiResponse, DeleteTagApiArg>({
      query: (queryArg) => ({
        url: `/api/tags/${queryArg.id}`,
        method: "DELETE",
      }),
    }),
    getScheduledSession: build.query<
      GetScheduledSessionApiResponse,
      GetScheduledSessionApiArg
    >({
      query: (queryArg) => ({
        url: `/api/scheduled-interactive-sessions/${queryArg.id}`,
      }),
    }),
    updateScheduledSession: build.mutation<
      UpdateScheduledSessionApiResponse,
      UpdateScheduledSessionApiArg
    >({
      query: (queryArg) => ({
        url: `/api/scheduled-interactive-sessions/${queryArg.id}`,
        method: "PUT",
        body: queryArg.updateScheduledInteractiveSessionRequest,
      }),
    }),
    updateOrg: build.mutation<UpdateOrgApiResponse, UpdateOrgApiArg>({
      query: (queryArg) => ({
        url: `/api/organizations/${queryArg.id}`,
        method: "PUT",
        body: queryArg.updateOrganizationRequest,
      }),
    }),
    markNotificationRead: build.mutation<
      MarkNotificationReadApiResponse,
      MarkNotificationReadApiArg
    >({
      query: (queryArg) => ({
        url: `/api/notifications/${queryArg.id}/read`,
        method: "PUT",
      }),
    }),
    markAllNotificationsRead: build.mutation<
      MarkAllNotificationsReadApiResponse,
      MarkAllNotificationsReadApiArg
    >({
      query: () => ({ url: `/api/notifications/read-all`, method: "PUT" }),
    }),
    getMedia: build.query<GetMediaApiResponse, GetMediaApiArg>({
      query: (queryArg) => ({ url: `/api/media/${queryArg.id}` }),
    }),
    updateMedia: build.mutation<UpdateMediaApiResponse, UpdateMediaApiArg>({
      query: (queryArg) => ({
        url: `/api/media/${queryArg.id}`,
        method: "PUT",
        body: queryArg.updateMediaAssetRequest,
      }),
    }),
    deleteMedia: build.mutation<DeleteMediaApiResponse, DeleteMediaApiArg>({
      query: (queryArg) => ({
        url: `/api/media/${queryArg.id}`,
        method: "DELETE",
      }),
    }),
    updateTeam: build.mutation<UpdateTeamApiResponse, UpdateTeamApiArg>({
      query: (queryArg) => ({
        url: `/api/interactive-sessions/${queryArg.roomCode}/teams/${queryArg.teamId}`,
        method: "PUT",
        body: queryArg.teamCrudRequest,
      }),
    }),
    deleteTeam: build.mutation<DeleteTeamApiResponse, DeleteTeamApiArg>({
      query: (queryArg) => ({
        url: `/api/interactive-sessions/${queryArg.roomCode}/teams/${queryArg.teamId}`,
        method: "DELETE",
      }),
    }),
    movePlayerToTeam: build.mutation<
      MovePlayerToTeamApiResponse,
      MovePlayerToTeamApiArg
    >({
      query: (queryArg) => ({
        url: `/api/interactive-sessions/${queryArg.roomCode}/players/${queryArg.playerId}/team`,
        method: "PUT",
        body: queryArg.teamMoveRequest,
      }),
    }),
    moderateChat: build.mutation<ModerateChatApiResponse, ModerateChatApiArg>({
      query: (queryArg) => ({
        url: `/api/interactive-sessions/${queryArg.roomCode}/chat/${queryArg.messageId}/moderate`,
        method: "PUT",
      }),
    }),
    updateImage: build.mutation<UpdateImageApiResponse, UpdateImageApiArg>({
      query: (queryArg) => ({
        url: `/api/gallery/${queryArg.id}`,
        method: "PUT",
        body: queryArg.updateGalleryImageRequest,
      }),
    }),
    deleteImage: build.mutation<DeleteImageApiResponse, DeleteImageApiArg>({
      query: (queryArg) => ({
        url: `/api/gallery/${queryArg.id}`,
        method: "DELETE",
      }),
    }),
    getDeck: build.query<GetDeckApiResponse, GetDeckApiArg>({
      query: (queryArg) => ({ url: `/api/decks/${queryArg.id}` }),
    }),
    updateDeck: build.mutation<UpdateDeckApiResponse, UpdateDeckApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}`,
        method: "PUT",
        body: queryArg.updateDeckRequest,
      }),
    }),
    deleteDeck: build.mutation<DeleteDeckApiResponse, DeleteDeckApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}`,
        method: "DELETE",
      }),
    }),
    rateDeck: build.mutation<RateDeckApiResponse, RateDeckApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/rating`,
        method: "PUT",
        body: queryArg.rateDeckRequest,
      }),
    }),
    deleteMyRating: build.mutation<
      DeleteMyRatingApiResponse,
      DeleteMyRatingApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/rating`,
        method: "DELETE",
      }),
    }),
    updateElement: build.mutation<
      UpdateElementApiResponse,
      UpdateElementApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/elements/${queryArg.elementId}`,
        method: "PUT",
        body: queryArg.body,
      }),
    }),
    deleteElement: build.mutation<
      DeleteElementApiResponse,
      DeleteElementApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/elements/${queryArg.elementId}`,
        method: "DELETE",
      }),
    }),
    updateCollaboratorRole: build.mutation<
      UpdateCollaboratorRoleApiResponse,
      UpdateCollaboratorRoleApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/collaborators/${queryArg.userId}`,
        method: "PUT",
        body: queryArg.updateCollaboratorRoleRequest,
      }),
    }),
    removeCollaborator: build.mutation<
      RemoveCollaboratorApiResponse,
      RemoveCollaboratorApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/collaborators/${queryArg.userId}`,
        method: "DELETE",
      }),
    }),
    editComment: build.mutation<EditCommentApiResponse, EditCommentApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.deckId}/comments/${queryArg.commentId}`,
        method: "PUT",
        body: queryArg.updateCommentRequest,
      }),
    }),
    deleteComment: build.mutation<
      DeleteCommentApiResponse,
      DeleteCommentApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.deckId}/comments/${queryArg.commentId}`,
        method: "DELETE",
      }),
    }),
    getCollection: build.query<GetCollectionApiResponse, GetCollectionApiArg>({
      query: (queryArg) => ({ url: `/api/collections/${queryArg.id}` }),
    }),
    updateCollection: build.mutation<
      UpdateCollectionApiResponse,
      UpdateCollectionApiArg
    >({
      query: (queryArg) => ({
        url: `/api/collections/${queryArg.id}`,
        method: "PUT",
        body: queryArg.updateDeckCollectionRequest,
      }),
    }),
    deleteCollection: build.mutation<
      DeleteCollectionApiResponse,
      DeleteCollectionApiArg
    >({
      query: (queryArg) => ({
        url: `/api/collections/${queryArg.id}`,
        method: "DELETE",
      }),
    }),
    uploadProfileImage: build.mutation<
      UploadProfileImageApiResponse,
      UploadProfileImageApiArg
    >({
      query: (queryArg) => ({
        url: `/api/users/me/profile-image`,
        method: "POST",
        body: queryArg.body,
      }),
    }),
    closeAccount: build.mutation<CloseAccountApiResponse, CloseAccountApiArg>({
      query: () => ({ url: `/api/users/me/close`, method: "POST" }),
    }),
    listThemes: build.query<ListThemesApiResponse, ListThemesApiArg>({
      query: () => ({ url: `/api/themes` }),
    }),
    createTheme: build.mutation<CreateThemeApiResponse, CreateThemeApiArg>({
      query: (queryArg) => ({
        url: `/api/themes`,
        method: "POST",
        body: queryArg.createThemeRequest,
      }),
    }),
    uploadLogo: build.mutation<UploadLogoApiResponse, UploadLogoApiArg>({
      query: (queryArg) => ({
        url: `/api/themes/${queryArg.id}/logo`,
        method: "POST",
        body: queryArg.body,
      }),
    }),
    uploadBackground: build.mutation<
      UploadBackgroundApiResponse,
      UploadBackgroundApiArg
    >({
      query: (queryArg) => ({
        url: `/api/themes/${queryArg.id}/background`,
        method: "POST",
        body: queryArg.body,
      }),
    }),
    listTags: build.query<ListTagsApiResponse, ListTagsApiArg>({
      query: (queryArg) => ({
        url: `/api/tags`,
        params: {
          curated: queryArg.curated,
          parentTagId: queryArg.parentTagId,
          search: queryArg.search,
          createdByMe: queryArg.createdByMe,
        },
      }),
    }),
    createTag: build.mutation<CreateTagApiResponse, CreateTagApiArg>({
      query: (queryArg) => ({
        url: `/api/tags`,
        method: "POST",
        body: queryArg.createTagRequest,
      }),
    }),
    createScheduledSession: build.mutation<
      CreateScheduledSessionApiResponse,
      CreateScheduledSessionApiArg
    >({
      query: (queryArg) => ({
        url: `/api/scheduled-interactive-sessions`,
        method: "POST",
        body: queryArg.createScheduledInteractiveSessionRequest,
      }),
    }),
    addScheduledInvite: build.mutation<
      AddScheduledInviteApiResponse,
      AddScheduledInviteApiArg
    >({
      query: (queryArg) => ({
        url: `/api/scheduled-interactive-sessions/${queryArg.id}/invite`,
        method: "POST",
        body: queryArg.addInviteRequest,
      }),
    }),
    cancelScheduledSession: build.mutation<
      CancelScheduledSessionApiResponse,
      CancelScheduledSessionApiArg
    >({
      query: (queryArg) => ({
        url: `/api/scheduled-interactive-sessions/${queryArg.id}/cancel`,
        method: "POST",
      }),
    }),
    unsubscribeGet: build.query<
      UnsubscribeGetApiResponse,
      UnsubscribeGetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/public/email/unsubscribe/${queryArg.token}`,
      }),
    }),
    unsubscribe: build.mutation<UnsubscribeApiResponse, UnsubscribeApiArg>({
      query: (queryArg) => ({
        url: `/api/public/email/unsubscribe/${queryArg.token}`,
        method: "POST",
      }),
    }),
    createOrg: build.mutation<CreateOrgApiResponse, CreateOrgApiArg>({
      query: (queryArg) => ({
        url: `/api/organizations`,
        method: "POST",
        body: queryArg.createOrganizationRequest,
      }),
    }),
    rotateInviteCode: build.mutation<
      RotateInviteCodeApiResponse,
      RotateInviteCodeApiArg
    >({
      query: (queryArg) => ({
        url: `/api/organizations/${queryArg.id}/invite-code/rotate`,
        method: "POST",
      }),
    }),
    joinOrg: build.mutation<JoinOrgApiResponse, JoinOrgApiArg>({
      query: (queryArg) => ({
        url: `/api/organizations/join`,
        method: "POST",
        body: queryArg.joinOrganizationRequest,
      }),
    }),
    joinByCode: build.mutation<JoinByCodeApiResponse, JoinByCodeApiArg>({
      query: (queryArg) => ({
        url: `/api/organizations/join-by-code`,
        method: "POST",
        body: queryArg.joinByCodeRequest,
      }),
    }),
    listMedia: build.query<ListMediaApiResponse, ListMediaApiArg>({
      query: (queryArg) => ({
        url: `/api/media`,
        params: {
          kind: queryArg.kind,
          tag: queryArg.tag,
        },
      }),
    }),
    uploadMedia: build.mutation<UploadMediaApiResponse, UploadMediaApiArg>({
      query: (queryArg) => ({
        url: `/api/media`,
        method: "POST",
        body: queryArg.body,
        params: {
          kind: queryArg.kind,
          name: queryArg.name,
          tags: queryArg.tags,
          organizationId: queryArg.organizationId,
          altText: queryArg.altText,
        },
      }),
    }),
    createMediaEmbed: build.mutation<
      CreateMediaEmbedApiResponse,
      CreateMediaEmbedApiArg
    >({
      query: (queryArg) => ({
        url: `/api/media/embed`,
        method: "POST",
        body: queryArg.createEmbedRequest,
      }),
    }),
    redeemInvite: build.mutation<RedeemInviteApiResponse, RedeemInviteApiArg>({
      query: (queryArg) => ({
        url: `/api/invites/${queryArg.token}/redeem`,
        method: "POST",
      }),
    }),
    createInteractiveSession: build.mutation<
      CreateInteractiveSessionApiResponse,
      CreateInteractiveSessionApiArg
    >({
      query: (queryArg) => ({
        url: `/api/interactive-sessions`,
        method: "POST",
        body: queryArg.createInteractiveSessionRequest,
      }),
    }),
    createTeam: build.mutation<CreateTeamApiResponse, CreateTeamApiArg>({
      query: (queryArg) => ({
        url: `/api/interactive-sessions/${queryArg.roomCode}/teams`,
        method: "POST",
        body: queryArg.teamCrudRequest,
      }),
    }),
    sendReaction: build.mutation<SendReactionApiResponse, SendReactionApiArg>({
      query: (queryArg) => ({
        url: `/api/interactive-sessions/${queryArg.roomCode}/reactions`,
        method: "POST",
        body: queryArg.reactionSendRequest,
      }),
    }),
    joinByRoomCode: build.mutation<
      JoinByRoomCodeApiResponse,
      JoinByRoomCodeApiArg
    >({
      query: (queryArg) => ({
        url: `/api/interactive-sessions/${queryArg.roomCode}/join`,
        method: "POST",
        body: queryArg.joinInteractiveSessionRequest,
      }),
    }),
    listChat: build.query<ListChatApiResponse, ListChatApiArg>({
      query: (queryArg) => ({
        url: `/api/interactive-sessions/${queryArg.roomCode}/chat`,
        params: {
          page: queryArg.page,
          size: queryArg.size,
        },
      }),
    }),
    sendChat: build.mutation<SendChatApiResponse, SendChatApiArg>({
      query: (queryArg) => ({
        url: `/api/interactive-sessions/${queryArg.roomCode}/chat`,
        method: "POST",
        body: queryArg.chatSendRequest,
      }),
    }),
    listImages: build.query<ListImagesApiResponse, ListImagesApiArg>({
      query: () => ({ url: `/api/gallery` }),
    }),
    uploadImage: build.mutation<UploadImageApiResponse, UploadImageApiArg>({
      query: (queryArg) => ({
        url: `/api/gallery`,
        method: "POST",
        body: queryArg.body,
        params: {
          name: queryArg.name,
          tags: queryArg.tags,
          organizationId: queryArg.organizationId,
        },
      }),
    }),
    listDecks: build.query<ListDecksApiResponse, ListDecksApiArg>({
      query: () => ({ url: `/api/decks` }),
    }),
    createDeck: build.mutation<CreateDeckApiResponse, CreateDeckApiArg>({
      query: (queryArg) => ({
        url: `/api/decks`,
        method: "POST",
        body: queryArg.createDeckRequest,
      }),
    }),
    unpublishDeck: build.mutation<
      UnpublishDeckApiResponse,
      UnpublishDeckApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/unpublish`,
        method: "POST",
      }),
    }),
    publishDeck: build.mutation<PublishDeckApiResponse, PublishDeckApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/publish`,
        method: "POST",
      }),
    }),
    favoriteDeck: build.mutation<FavoriteDeckApiResponse, FavoriteDeckApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/favorite`,
        method: "POST",
      }),
    }),
    unfavoriteDeck: build.mutation<
      UnfavoriteDeckApiResponse,
      UnfavoriteDeckApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/favorite`,
        method: "DELETE",
      }),
    }),
    recountFavorites: build.mutation<
      RecountFavoritesApiResponse,
      RecountFavoritesApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/favorite/recount`,
        method: "POST",
      }),
    }),
    addElement: build.mutation<AddElementApiResponse, AddElementApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/elements`,
        method: "POST",
        body: queryArg.body,
      }),
    }),
    moveMcqOption: build.mutation<
      MoveMcqOptionApiResponse,
      MoveMcqOptionApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/elements/${queryArg.elementId}/options/${queryArg.optionId}/move`,
        method: "POST",
        params: {
          to: queryArg.to,
        },
      }),
    }),
    moveElement: build.mutation<MoveElementApiResponse, MoveElementApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/elements/${queryArg.elementId}/move`,
        method: "POST",
        params: {
          to: queryArg.to,
        },
      }),
    }),
    listComments: build.query<ListCommentsApiResponse, ListCommentsApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/comments`,
        params: {
          page: queryArg.page,
          size: queryArg.size,
        },
      }),
    }),
    postComment: build.mutation<PostCommentApiResponse, PostCommentApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/comments`,
        method: "POST",
        body: queryArg.createCommentRequest,
      }),
    }),
    listCollaborators: build.query<
      ListCollaboratorsApiResponse,
      ListCollaboratorsApiArg
    >({
      query: (queryArg) => ({ url: `/api/decks/${queryArg.id}/collaborators` }),
    }),
    inviteCollaborator: build.mutation<
      InviteCollaboratorApiResponse,
      InviteCollaboratorApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/collaborators`,
        method: "POST",
        body: queryArg.inviteCollaboratorRequest,
      }),
    }),
    transferOwnership: build.mutation<
      TransferOwnershipApiResponse,
      TransferOwnershipApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/collaborators/transfer`,
        method: "POST",
        body: queryArg.transferOwnershipRequest,
      }),
    }),
    archiveDeck: build.mutation<ArchiveDeckApiResponse, ArchiveDeckApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/archive`,
        method: "POST",
      }),
    }),
    toggleCommentUpvote: build.mutation<
      ToggleCommentUpvoteApiResponse,
      ToggleCommentUpvoteApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.deckId}/comments/${queryArg.commentId}/upvote`,
        method: "POST",
      }),
    }),
    createCollection: build.mutation<
      CreateCollectionApiResponse,
      CreateCollectionApiArg
    >({
      query: (queryArg) => ({
        url: `/api/collections`,
        method: "POST",
        body: queryArg.createDeckCollectionRequest,
      }),
    }),
    addDeckToCollection: build.mutation<
      AddDeckToCollectionApiResponse,
      AddDeckToCollectionApiArg
    >({
      query: (queryArg) => ({
        url: `/api/collections/${queryArg.id}/decks`,
        method: "POST",
        body: queryArg.addDeckToCollectionRequest,
      }),
    }),
    reorderCollectionDecks: build.mutation<
      ReorderCollectionDecksApiResponse,
      ReorderCollectionDecksApiArg
    >({
      query: (queryArg) => ({
        url: `/api/collections/${queryArg.id}/decks`,
        method: "PATCH",
        body: queryArg.reorderCollectionDecksRequest,
      }),
    }),
    register: build.mutation<RegisterApiResponse, RegisterApiArg>({
      query: (queryArg) => ({
        url: `/api/auth/register`,
        method: "POST",
        body: queryArg.registerRequest,
      }),
    }),
    guestLogin: build.mutation<GuestLoginApiResponse, GuestLoginApiArg>({
      query: (queryArg) => ({
        url: `/api/auth/guest`,
        method: "POST",
        body: queryArg.guestLoginRequest,
      }),
    }),
    updateProfile: build.mutation<
      UpdateProfileApiResponse,
      UpdateProfileApiArg
    >({
      query: (queryArg) => ({
        url: `/api/users/me`,
        method: "PATCH",
        body: queryArg.updateProfileRequest,
      }),
    }),
    listUserHistory: build.query<
      ListUserHistoryApiResponse,
      ListUserHistoryApiArg
    >({
      query: (queryArg) => ({
        url: `/api/users/${queryArg.userId}/history`,
        params: {
          page: queryArg.page,
          size: queryArg.size,
        },
      }),
    }),
    listAchievementsForUser: build.query<
      ListAchievementsForUserApiResponse,
      ListAchievementsForUserApiArg
    >({
      query: (queryArg) => ({
        url: `/api/users/${queryArg.userId}/achievements`,
      }),
    }),
    getUserProfile: build.query<
      GetUserProfileApiResponse,
      GetUserProfileApiArg
    >({
      query: (queryArg) => ({ url: `/api/users/${queryArg.id}` }),
    }),
    listMyHistory: build.query<ListMyHistoryApiResponse, ListMyHistoryApiArg>({
      query: (queryArg) => ({
        url: `/api/users/me/history`,
        params: {
          page: queryArg.page,
          size: queryArg.size,
        },
      }),
    }),
    listMyFavorites: build.query<
      ListMyFavoritesApiResponse,
      ListMyFavoritesApiArg
    >({
      query: (queryArg) => ({
        url: `/api/users/me/favorites`,
        params: {
          page: queryArg.page,
          size: queryArg.size,
        },
      }),
    }),
    listMyAchievements: build.query<
      ListMyAchievementsApiResponse,
      ListMyAchievementsApiArg
    >({
      query: () => ({ url: `/api/users/me/achievements` }),
    }),
    getLeaderboard: build.query<
      GetLeaderboardApiResponse,
      GetLeaderboardApiArg
    >({
      query: (queryArg) => ({
        url: `/api/users/leaderboard`,
        params: {
          page: queryArg.page,
          size: queryArg.size,
        },
      }),
    }),
    checkUsername: build.query<CheckUsernameApiResponse, CheckUsernameApiArg>({
      query: (queryArg) => ({
        url: `/api/users/check-username`,
        params: {
          username: queryArg.username,
        },
      }),
    }),
    listScheduledInvites: build.query<
      ListScheduledInvitesApiResponse,
      ListScheduledInvitesApiArg
    >({
      query: (queryArg) => ({
        url: `/api/scheduled-interactive-sessions/${queryArg.id}/invites`,
      }),
    }),
    listMyScheduledSessions: build.query<
      ListMyScheduledSessionsApiResponse,
      ListMyScheduledSessionsApiArg
    >({
      query: () => ({ url: `/api/scheduled-interactive-sessions/mine` }),
    }),
    listMyOrgs: build.query<ListMyOrgsApiResponse, ListMyOrgsApiArg>({
      query: () => ({ url: `/api/organizations/mine` }),
    }),
    listNotifications: build.query<
      ListNotificationsApiResponse,
      ListNotificationsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/notifications`,
        params: {
          page: queryArg.page,
          size: queryArg.size,
        },
      }),
    }),
    getUnreadNotificationCount: build.query<
      GetUnreadNotificationCountApiResponse,
      GetUnreadNotificationCountApiArg
    >({
      query: () => ({ url: `/api/notifications/unread-count` }),
    }),
    getInteractiveSession: build.query<
      GetInteractiveSessionApiResponse,
      GetInteractiveSessionApiArg
    >({
      query: (queryArg) => ({
        url: `/api/interactive-sessions/${queryArg.roomCode}`,
      }),
    }),
    cancelInteractiveSession: build.mutation<
      CancelInteractiveSessionApiResponse,
      CancelInteractiveSessionApiArg
    >({
      query: (queryArg) => ({
        url: `/api/interactive-sessions/${queryArg.roomCode}`,
        method: "DELETE",
      }),
    }),
    getReview: build.query<GetReviewApiResponse, GetReviewApiArg>({
      query: (queryArg) => ({
        url: `/api/interactive-sessions/${queryArg.roomCode}/review`,
      }),
    }),
    getResults: build.query<GetResultsApiResponse, GetResultsApiArg>({
      query: (queryArg) => ({
        url: `/api/interactive-sessions/${queryArg.roomCode}/results`,
      }),
    }),
    getByInviteToken: build.query<
      GetByInviteTokenApiResponse,
      GetByInviteTokenApiArg
    >({
      query: (queryArg) => ({
        url: `/api/interactive-sessions/join/${queryArg.inviteToken}`,
      }),
    }),
    getHealth: build.query<GetHealthApiResponse, GetHealthApiArg>({
      query: () => ({ url: `/api/health` }),
    }),
    listRatings: build.query<ListRatingsApiResponse, ListRatingsApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.id}/ratings`,
        params: {
          page: queryArg.page,
          size: queryArg.size,
        },
      }),
    }),
    getMyRating: build.query<GetMyRatingApiResponse, GetMyRatingApiArg>({
      query: (queryArg) => ({ url: `/api/decks/${queryArg.id}/rating/mine` }),
    }),
    getDeckAnalytics: build.query<
      GetDeckAnalyticsApiResponse,
      GetDeckAnalyticsApiArg
    >({
      query: (queryArg) => ({ url: `/api/decks/${queryArg.id}/analytics` }),
    }),
    getDeckAnalyticsCsv: build.query<
      GetDeckAnalyticsCsvApiResponse,
      GetDeckAnalyticsCsvApiArg
    >({
      query: (queryArg) => ({ url: `/api/decks/${queryArg.id}/analytics/csv` }),
    }),
    listMyHistoryForDeck: build.query<
      ListMyHistoryForDeckApiResponse,
      ListMyHistoryForDeckApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.deckId}/history/mine`,
        params: {
          page: queryArg.page,
          size: queryArg.size,
        },
      }),
    }),
    listReplies: build.query<ListRepliesApiResponse, ListRepliesApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.deckId}/comments/${queryArg.commentId}/replies`,
        params: {
          page: queryArg.page,
          size: queryArg.size,
        },
      }),
    }),
    listMyDecks: build.query<ListMyDecksApiResponse, ListMyDecksApiArg>({
      query: () => ({ url: `/api/decks/mine` }),
    }),
    exploreDecks: build.query<ExploreDecksApiResponse, ExploreDecksApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/explore`,
        params: {
          tagId: queryArg.tagId,
          language: queryArg.language,
          difficulty: queryArg.difficulty,
          sort: queryArg.sort,
          page: queryArg.page,
          size: queryArg.size,
        },
      }),
    }),
    listMyCollections: build.query<
      ListMyCollectionsApiResponse,
      ListMyCollectionsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/collections/mine`,
        params: {
          page: queryArg.page,
          size: queryArg.size,
        },
      }),
    }),
    getCurrentUser: build.query<
      GetCurrentUserApiResponse,
      GetCurrentUserApiArg
    >({
      query: () => ({ url: `/api/auth/me` }),
    }),
    login: build.query<LoginApiResponse, LoginApiArg>({
      query: (queryArg) => ({
        url: `/api/auth/login`,
        params: {
          returnUrl: queryArg.returnUrl,
          guestId: queryArg.guestId,
          provider: queryArg.provider,
        },
      }),
    }),
    listCatalog: build.query<ListCatalogApiResponse, ListCatalogApiArg>({
      query: () => ({ url: `/api/achievements` }),
    }),
    leaveOrg: build.mutation<LeaveOrgApiResponse, LeaveOrgApiArg>({
      query: (queryArg) => ({
        url: `/api/organizations/${queryArg.id}/leave`,
        method: "DELETE",
      }),
    }),
    dismissNotification: build.mutation<
      DismissNotificationApiResponse,
      DismissNotificationApiArg
    >({
      query: (queryArg) => ({
        url: `/api/notifications/${queryArg.id}`,
        method: "DELETE",
      }),
    }),
    removeDeckFromCollection: build.mutation<
      RemoveDeckFromCollectionApiResponse,
      RemoveDeckFromCollectionApiArg
    >({
      query: (queryArg) => ({
        url: `/api/collections/${queryArg.id}/decks/${queryArg.deckId}`,
        method: "DELETE",
      }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as BrainFlex };
export type GetNotificationPrefsApiResponse =
  /** status 200 OK */ NotificationPrefs;
export type GetNotificationPrefsApiArg = void;
export type UpdateNotificationPrefsApiResponse =
  /** status 200 OK */ NotificationPrefs;
export type UpdateNotificationPrefsApiArg = {
  notificationPrefs: NotificationPrefs;
};
export type UpdateThemeApiResponse = /** status 200 OK */ ThemeResponse;
export type UpdateThemeApiArg = {
  id: string;
  updateThemeRequest: UpdateThemeRequest;
};
export type DeleteThemeApiResponse = unknown;
export type DeleteThemeApiArg = {
  id: string;
};
export type GetTagApiResponse = /** status 200 OK */ TagResponse;
export type GetTagApiArg = {
  id: string;
};
export type UpdateTagApiResponse = /** status 200 OK */ TagResponse;
export type UpdateTagApiArg = {
  id: string;
  updateTagRequest: UpdateTagRequest;
};
export type DeleteTagApiResponse = unknown;
export type DeleteTagApiArg = {
  id: string;
};
export type GetScheduledSessionApiResponse =
  /** status 200 OK */ ScheduledInteractiveSessionResponse;
export type GetScheduledSessionApiArg = {
  id: string;
};
export type UpdateScheduledSessionApiResponse =
  /** status 200 OK */ ScheduledInteractiveSessionResponse;
export type UpdateScheduledSessionApiArg = {
  id: string;
  updateScheduledInteractiveSessionRequest: UpdateScheduledInteractiveSessionRequest;
};
export type UpdateOrgApiResponse = /** status 200 OK */ OrganizationResponse;
export type UpdateOrgApiArg = {
  id: string;
  updateOrganizationRequest: UpdateOrganizationRequest;
};
export type MarkNotificationReadApiResponse =
  /** status 200 OK */ NotificationResponse;
export type MarkNotificationReadApiArg = {
  id: string;
};
export type MarkAllNotificationsReadApiResponse =
  /** status 200 OK */ UnreadNotificationCountResponse;
export type MarkAllNotificationsReadApiArg = void;
export type GetMediaApiResponse = /** status 200 OK */ MediaAssetResponse;
export type GetMediaApiArg = {
  id: string;
};
export type UpdateMediaApiResponse = /** status 200 OK */ MediaAssetResponse;
export type UpdateMediaApiArg = {
  id: string;
  updateMediaAssetRequest: UpdateMediaAssetRequest;
};
export type DeleteMediaApiResponse = unknown;
export type DeleteMediaApiArg = {
  id: string;
};
export type UpdateTeamApiResponse =
  /** status 200 OK */ InteractiveSessionResponse;
export type UpdateTeamApiArg = {
  roomCode: string;
  teamId: string;
  teamCrudRequest: TeamCrudRequest;
};
export type DeleteTeamApiResponse =
  /** status 200 OK */ InteractiveSessionResponse;
export type DeleteTeamApiArg = {
  roomCode: string;
  teamId: string;
};
export type MovePlayerToTeamApiResponse =
  /** status 200 OK */ InteractiveSessionResponse;
export type MovePlayerToTeamApiArg = {
  roomCode: string;
  playerId: string;
  teamMoveRequest: TeamMoveRequest;
};
export type ModerateChatApiResponse =
  /** status 200 OK */ InteractiveSessionChatMessageResponse;
export type ModerateChatApiArg = {
  roomCode: string;
  messageId: string;
};
export type UpdateImageApiResponse = /** status 200 OK */ GalleryImageResponse;
export type UpdateImageApiArg = {
  id: string;
  updateGalleryImageRequest: UpdateGalleryImageRequest;
};
export type DeleteImageApiResponse = unknown;
export type DeleteImageApiArg = {
  id: string;
};
export type GetDeckApiResponse = /** status 200 OK */ DeckResponse;
export type GetDeckApiArg = {
  id: string;
};
export type UpdateDeckApiResponse = /** status 200 OK */ DeckResponse;
export type UpdateDeckApiArg = {
  id: string;
  updateDeckRequest: UpdateDeckRequest;
};
export type DeleteDeckApiResponse = unknown;
export type DeleteDeckApiArg = {
  id: string;
};
export type RateDeckApiResponse = /** status 200 OK */ DeckRatingResponse;
export type RateDeckApiArg = {
  id: string;
  rateDeckRequest: RateDeckRequest;
};
export type DeleteMyRatingApiResponse = unknown;
export type DeleteMyRatingApiArg = {
  id: string;
};
export type UpdateElementApiResponse = /** status 200 OK */ DeckResponse;
export type UpdateElementApiArg = {
  id: string;
  elementId: string;
  body:
    | AllocationQuestion
    | DrawingQuestion
    | GridQuestion
    | MatchingQuestion
    | McqQuestion
    | NumberQuestion
    | PlaceOnImageQuestion
    | QAndAQuestion
    | RankingQuestion
    | ScalesQuestion
    | Slide
    | TextQuestion
    | WordCloudQuestion;
};
export type DeleteElementApiResponse = /** status 200 OK */ DeckResponse;
export type DeleteElementApiArg = {
  id: string;
  elementId: string;
};
export type UpdateCollaboratorRoleApiResponse =
  /** status 200 OK */ DeckCollaboratorResponse;
export type UpdateCollaboratorRoleApiArg = {
  id: string;
  userId: string;
  updateCollaboratorRoleRequest: UpdateCollaboratorRoleRequest;
};
export type RemoveCollaboratorApiResponse = unknown;
export type RemoveCollaboratorApiArg = {
  id: string;
  userId: string;
};
export type EditCommentApiResponse = /** status 200 OK */ DeckCommentResponse;
export type EditCommentApiArg = {
  deckId: string;
  commentId: string;
  updateCommentRequest: UpdateCommentRequest;
};
export type DeleteCommentApiResponse = /** status 200 OK */ DeckCommentResponse;
export type DeleteCommentApiArg = {
  deckId: string;
  commentId: string;
};
export type GetCollectionApiResponse =
  /** status 200 OK */ DeckCollectionResponse;
export type GetCollectionApiArg = {
  id: string;
};
export type UpdateCollectionApiResponse =
  /** status 200 OK */ DeckCollectionResponse;
export type UpdateCollectionApiArg = {
  id: string;
  updateDeckCollectionRequest: UpdateDeckCollectionRequest;
};
export type DeleteCollectionApiResponse = unknown;
export type DeleteCollectionApiArg = {
  id: string;
};
export type UploadProfileImageApiResponse = /** status 200 OK */ RegisteredUser;
export type UploadProfileImageApiArg = {
  body: {
    image: Blob;
  };
};
export type CloseAccountApiResponse = unknown;
export type CloseAccountApiArg = void;
export type ListThemesApiResponse = /** status 200 OK */ ThemeResponse[];
export type ListThemesApiArg = void;
export type CreateThemeApiResponse = /** status 200 OK */ ThemeResponse;
export type CreateThemeApiArg = {
  createThemeRequest: CreateThemeRequest;
};
export type UploadLogoApiResponse = /** status 200 OK */ ThemeResponse;
export type UploadLogoApiArg = {
  id: string;
  body: {
    image: Blob;
  };
};
export type UploadBackgroundApiResponse = /** status 200 OK */ ThemeResponse;
export type UploadBackgroundApiArg = {
  id: string;
  body: {
    image: Blob;
  };
};
export type ListTagsApiResponse = /** status 200 OK */ TagResponse[];
export type ListTagsApiArg = {
  curated?: boolean;
  parentTagId?: string;
  search?: string;
  createdByMe?: boolean;
};
export type CreateTagApiResponse = /** status 200 OK */ TagResponse;
export type CreateTagApiArg = {
  createTagRequest: CreateTagRequest;
};
export type CreateScheduledSessionApiResponse =
  /** status 200 OK */ ScheduledInteractiveSessionResponse;
export type CreateScheduledSessionApiArg = {
  createScheduledInteractiveSessionRequest: CreateScheduledInteractiveSessionRequest;
};
export type AddScheduledInviteApiResponse =
  /** status 200 OK */ InteractiveSessionInviteResponse;
export type AddScheduledInviteApiArg = {
  id: string;
  addInviteRequest: AddInviteRequest;
};
export type CancelScheduledSessionApiResponse =
  /** status 200 OK */ ScheduledInteractiveSessionResponse;
export type CancelScheduledSessionApiArg = {
  id: string;
};
export type UnsubscribeGetApiResponse =
  /** status 200 OK */ UnsubscribeResponse;
export type UnsubscribeGetApiArg = {
  token: string;
};
export type UnsubscribeApiResponse = /** status 200 OK */ UnsubscribeResponse;
export type UnsubscribeApiArg = {
  token: string;
};
export type CreateOrgApiResponse = /** status 200 OK */ OrganizationResponse;
export type CreateOrgApiArg = {
  createOrganizationRequest: CreateOrganizationRequest;
};
export type RotateInviteCodeApiResponse =
  /** status 200 OK */ OrganizationResponse;
export type RotateInviteCodeApiArg = {
  id: string;
};
export type JoinOrgApiResponse = /** status 200 OK */ OrganizationResponse;
export type JoinOrgApiArg = {
  joinOrganizationRequest: JoinOrganizationRequest;
};
export type JoinByCodeApiResponse = /** status 200 OK */ OrganizationResponse;
export type JoinByCodeApiArg = {
  joinByCodeRequest: JoinByCodeRequest;
};
export type ListMediaApiResponse = /** status 200 OK */ MediaAssetResponse[];
export type ListMediaApiArg = {
  kind?: "IMAGE" | "AUDIO" | "VIDEO_FILE" | "VIDEO_EMBED";
  tag?: string;
};
export type UploadMediaApiResponse = /** status 200 OK */ MediaAssetResponse;
export type UploadMediaApiArg = {
  kind: "IMAGE" | "AUDIO" | "VIDEO_FILE" | "VIDEO_EMBED";
  name?: string;
  tags?: string;
  organizationId?: string;
  altText?: string;
  body: {
    file: Blob;
  };
};
export type CreateMediaEmbedApiResponse =
  /** status 200 OK */ MediaAssetResponse;
export type CreateMediaEmbedApiArg = {
  createEmbedRequest: CreateEmbedRequest;
};
export type RedeemInviteApiResponse = /** status 200 OK */ RedeemInviteResponse;
export type RedeemInviteApiArg = {
  token: string;
};
export type CreateInteractiveSessionApiResponse =
  /** status 200 OK */ InteractiveSessionResponse;
export type CreateInteractiveSessionApiArg = {
  createInteractiveSessionRequest: CreateInteractiveSessionRequest;
};
export type CreateTeamApiResponse =
  /** status 200 OK */ InteractiveSessionResponse;
export type CreateTeamApiArg = {
  roomCode: string;
  teamCrudRequest: TeamCrudRequest;
};
export type SendReactionApiResponse = /** status 200 OK */ Reaction;
export type SendReactionApiArg = {
  roomCode: string;
  reactionSendRequest: ReactionSendRequest;
};
export type JoinByRoomCodeApiResponse =
  /** status 200 OK */ InteractiveSessionResponse;
export type JoinByRoomCodeApiArg = {
  roomCode: string;
  joinInteractiveSessionRequest: JoinInteractiveSessionRequest;
};
export type ListChatApiResponse =
  /** status 200 OK */ InteractiveSessionChatMessageResponse[];
export type ListChatApiArg = {
  roomCode: string;
  page?: number;
  size?: number;
};
export type SendChatApiResponse =
  /** status 200 OK */ InteractiveSessionChatMessageResponse;
export type SendChatApiArg = {
  roomCode: string;
  chatSendRequest: ChatSendRequest;
};
export type ListImagesApiResponse = /** status 200 OK */ GalleryImageResponse[];
export type ListImagesApiArg = void;
export type UploadImageApiResponse = /** status 200 OK */ GalleryImageResponse;
export type UploadImageApiArg = {
  name?: string;
  tags?: string;
  organizationId?: string;
  body: {
    image: Blob;
  };
};
export type ListDecksApiResponse = /** status 200 OK */ DeckResponse[];
export type ListDecksApiArg = void;
export type CreateDeckApiResponse = /** status 200 OK */ DeckResponse;
export type CreateDeckApiArg = {
  createDeckRequest: CreateDeckRequest;
};
export type UnpublishDeckApiResponse = /** status 200 OK */ DeckResponse;
export type UnpublishDeckApiArg = {
  id: string;
};
export type PublishDeckApiResponse = /** status 200 OK */ DeckResponse;
export type PublishDeckApiArg = {
  id: string;
};
export type FavoriteDeckApiResponse = /** status 200 OK */ DeckFavoriteResponse;
export type FavoriteDeckApiArg = {
  id: string;
};
export type UnfavoriteDeckApiResponse =
  /** status 200 OK */ DeckFavoriteResponse;
export type UnfavoriteDeckApiArg = {
  id: string;
};
export type RecountFavoritesApiResponse =
  /** status 200 OK */ DeckFavoriteResponse;
export type RecountFavoritesApiArg = {
  id: string;
};
export type AddElementApiResponse = /** status 200 OK */ DeckResponse;
export type AddElementApiArg = {
  id: string;
  body:
    | AllocationQuestion
    | DrawingQuestion
    | GridQuestion
    | MatchingQuestion
    | McqQuestion
    | NumberQuestion
    | PlaceOnImageQuestion
    | QAndAQuestion
    | RankingQuestion
    | ScalesQuestion
    | Slide
    | TextQuestion
    | WordCloudQuestion;
};
export type MoveMcqOptionApiResponse = /** status 200 OK */ DeckResponse;
export type MoveMcqOptionApiArg = {
  id: string;
  elementId: string;
  optionId: string;
  to: number;
};
export type MoveElementApiResponse = /** status 200 OK */ DeckResponse;
export type MoveElementApiArg = {
  id: string;
  elementId: string;
  to: number;
};
export type ListCommentsApiResponse =
  /** status 200 OK */ PageDeckCommentResponse;
export type ListCommentsApiArg = {
  id: string;
  page?: number;
  size?: number;
};
export type PostCommentApiResponse = /** status 200 OK */ DeckCommentResponse;
export type PostCommentApiArg = {
  id: string;
  createCommentRequest: CreateCommentRequest;
};
export type ListCollaboratorsApiResponse =
  /** status 200 OK */ DeckCollaboratorResponse[];
export type ListCollaboratorsApiArg = {
  id: string;
};
export type InviteCollaboratorApiResponse =
  /** status 200 OK */ DeckCollaboratorResponse;
export type InviteCollaboratorApiArg = {
  id: string;
  inviteCollaboratorRequest: InviteCollaboratorRequest;
};
export type TransferOwnershipApiResponse =
  /** status 200 OK */ DeckCollaboratorResponse[];
export type TransferOwnershipApiArg = {
  id: string;
  transferOwnershipRequest: TransferOwnershipRequest;
};
export type ArchiveDeckApiResponse = /** status 200 OK */ DeckResponse;
export type ArchiveDeckApiArg = {
  id: string;
};
export type ToggleCommentUpvoteApiResponse =
  /** status 200 OK */ DeckCommentResponse;
export type ToggleCommentUpvoteApiArg = {
  deckId: string;
  commentId: string;
};
export type CreateCollectionApiResponse =
  /** status 200 OK */ DeckCollectionResponse;
export type CreateCollectionApiArg = {
  createDeckCollectionRequest: CreateDeckCollectionRequest;
};
export type AddDeckToCollectionApiResponse =
  /** status 200 OK */ DeckCollectionResponse;
export type AddDeckToCollectionApiArg = {
  id: string;
  addDeckToCollectionRequest: AddDeckToCollectionRequest;
};
export type ReorderCollectionDecksApiResponse =
  /** status 200 OK */ DeckCollectionResponse;
export type ReorderCollectionDecksApiArg = {
  id: string;
  reorderCollectionDecksRequest: ReorderCollectionDecksRequest;
};
export type RegisterApiResponse = /** status 200 OK */ RegisteredUser;
export type RegisterApiArg = {
  registerRequest: RegisterRequest;
};
export type GuestLoginApiResponse = /** status 200 OK */ GuestUser;
export type GuestLoginApiArg = {
  guestLoginRequest: GuestLoginRequest;
};
export type UpdateProfileApiResponse = /** status 200 OK */ RegisteredUser;
export type UpdateProfileApiArg = {
  updateProfileRequest: UpdateProfileRequest;
};
export type ListUserHistoryApiResponse =
  /** status 200 OK */ PageGameHistoryResponse;
export type ListUserHistoryApiArg = {
  userId: string;
  page?: number;
  size?: number;
};
export type ListAchievementsForUserApiResponse =
  /** status 200 OK */ UserAchievementsPage;
export type ListAchievementsForUserApiArg = {
  userId: string;
};
export type GetUserProfileApiResponse = /** status 200 OK */ RegisteredUser;
export type GetUserProfileApiArg = {
  id: string;
};
export type ListMyHistoryApiResponse =
  /** status 200 OK */ PageGameHistoryResponse;
export type ListMyHistoryApiArg = {
  page?: number;
  size?: number;
};
export type ListMyFavoritesApiResponse = /** status 200 OK */ PageDeckResponse;
export type ListMyFavoritesApiArg = {
  page?: number;
  size?: number;
};
export type ListMyAchievementsApiResponse =
  /** status 200 OK */ UserAchievementsPage;
export type ListMyAchievementsApiArg = void;
export type GetLeaderboardApiResponse = /** status 200 OK */ GuestUser[];
export type GetLeaderboardApiArg = {
  page?: number;
  size?: number;
};
export type CheckUsernameApiResponse = /** status 200 OK */ {
  [key: string]: boolean;
};
export type CheckUsernameApiArg = {
  username: string;
};
export type ListScheduledInvitesApiResponse =
  /** status 200 OK */ InteractiveSessionInviteResponse[];
export type ListScheduledInvitesApiArg = {
  id: string;
};
export type ListMyScheduledSessionsApiResponse =
  /** status 200 OK */ ScheduledInteractiveSessionResponse[];
export type ListMyScheduledSessionsApiArg = void;
export type ListMyOrgsApiResponse = /** status 200 OK */ OrganizationResponse[];
export type ListMyOrgsApiArg = void;
export type ListNotificationsApiResponse =
  /** status 200 OK */ PageNotificationResponse;
export type ListNotificationsApiArg = {
  page?: number;
  size?: number;
};
export type GetUnreadNotificationCountApiResponse =
  /** status 200 OK */ UnreadNotificationCountResponse;
export type GetUnreadNotificationCountApiArg = void;
export type GetInteractiveSessionApiResponse =
  /** status 200 OK */ InteractiveSessionResponse;
export type GetInteractiveSessionApiArg = {
  roomCode: string;
};
export type CancelInteractiveSessionApiResponse = unknown;
export type CancelInteractiveSessionApiArg = {
  roomCode: string;
};
export type GetReviewApiResponse =
  /** status 200 OK */ InteractiveSessionReviewResponse;
export type GetReviewApiArg = {
  roomCode: string;
};
export type GetResultsApiResponse =
  /** status 200 OK */ InteractiveSessionResultResponse;
export type GetResultsApiArg = {
  roomCode: string;
};
export type GetByInviteTokenApiResponse =
  /** status 200 OK */ InteractiveSessionResponse;
export type GetByInviteTokenApiArg = {
  inviteToken: string;
};
export type GetHealthApiResponse = /** status 200 OK */ HealthCheckResponse;
export type GetHealthApiArg = void;
export type ListRatingsApiResponse = /** status 200 OK */ DeckRatingsPage;
export type ListRatingsApiArg = {
  id: string;
  page?: number;
  size?: number;
};
export type GetMyRatingApiResponse = /** status 200 OK */ DeckRatingResponse;
export type GetMyRatingApiArg = {
  id: string;
};
export type GetDeckAnalyticsApiResponse = /** status 200 OK */ DeckAnalytics;
export type GetDeckAnalyticsApiArg = {
  id: string;
};
export type GetDeckAnalyticsCsvApiResponse = unknown;
export type GetDeckAnalyticsCsvApiArg = {
  id: string;
};
export type ListMyHistoryForDeckApiResponse =
  /** status 200 OK */ PageGameHistoryResponse;
export type ListMyHistoryForDeckApiArg = {
  deckId: string;
  page?: number;
  size?: number;
};
export type ListRepliesApiResponse =
  /** status 200 OK */ PageDeckCommentResponse;
export type ListRepliesApiArg = {
  deckId: string;
  commentId: string;
  page?: number;
  size?: number;
};
export type ListMyDecksApiResponse = /** status 200 OK */ DeckResponse[];
export type ListMyDecksApiArg = void;
export type ExploreDecksApiResponse = /** status 200 OK */ PageDeckResponse;
export type ExploreDecksApiArg = {
  tagId?: string;
  language?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  sort?: string;
  page?: number;
  size?: number;
};
export type ListMyCollectionsApiResponse =
  /** status 200 OK */ PageDeckCollectionResponse;
export type ListMyCollectionsApiArg = {
  page?: number;
  size?: number;
};
export type GetCurrentUserApiResponse = /** status 200 OK */ UserResponse;
export type GetCurrentUserApiArg = void;
export type LoginApiResponse = unknown;
export type LoginApiArg = {
  returnUrl?: string;
  guestId?: string;
  provider?: string;
};
export type ListCatalogApiResponse = /** status 200 OK */ AchievementResponse[];
export type ListCatalogApiArg = void;
export type LeaveOrgApiResponse = unknown;
export type LeaveOrgApiArg = {
  id: string;
};
export type DismissNotificationApiResponse = unknown;
export type DismissNotificationApiArg = {
  id: string;
};
export type RemoveDeckFromCollectionApiResponse =
  /** status 200 OK */ DeckCollectionResponse;
export type RemoveDeckFromCollectionApiArg = {
  id: string;
  deckId: string;
};
export type NotificationPrefs = {
  inApp?: {
    [key: string]: boolean;
  };
  email?: {
    [key: string]: boolean;
  };
  weeklyDigestEmail?: boolean;
  marketingEmail?: boolean;
};
export type ImageVariant = {
  url?: string;
  width?: number;
  height?: number;
};
export type Image = {
  useExternalImg?: boolean;
  internalImgId?: string;
  externalUrl?: string;
  variants?: {
    [key: string]: ImageVariant;
  };
  blank?: boolean;
};
export type ThemeResponse = {
  id?: string;
  name?: string;
  ownerId?: string;
  organizationId?: string;
  huePrimary?: number;
  hueAccent?: number;
  mode?: "LIGHT" | "DARK" | "SYSTEM";
  backgroundImageUrl?: string;
  logoImageUrl?: string;
  background?: Image;
  logo?: Image;
  createdAt?: string;
};
export type UpdateThemeRequest = {
  name?: string;
  huePrimary?: number;
  hueAccent?: number;
  mode?: "LIGHT" | "DARK" | "SYSTEM";
  organizationId?: string;
};
export type TagResponse = {
  id?: string;
  displayName?: string;
  parentTagId?: string;
  description?: string;
  iconUrl?: string;
  deckCount?: number;
  curated?: boolean;
  createdByUserId?: string;
  children?: TagResponse[];
  createdAt?: string;
  updatedAt?: string;
};
export type UpdateTagRequest = {
  displayName?: string;
  parentTagId?: string;
  description?: string;
  iconUrl?: string;
  curated?: boolean;
};
export type InteractiveSessionSettings = {
  maxPlayers?: number;
  totalRounds?: number;
  timePerQuestion?: number;
  speedBonus?: boolean;
  allowGuests?: boolean;
  showResponses?: "INHERIT" | "INSTANT" | "ON_CLICK" | "PRIVATE";
  allowLateJoin?: boolean;
  showScoresImmediately?: boolean;
  scoringEnabled?: boolean;
  reactionsEnabled?: boolean;
  chatEnabled?: boolean;
  teamMode?: boolean;
  teamCount?: number;
  autoBalanceTeams?: boolean;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  autoAdvance?: boolean;
  podiumDuration?: number;
  lobbyCountdownSeconds?: number;
  lobbyMusicAssetId?: string;
  requireFullName?: boolean;
  spectatorsAllowed?: boolean;
  deckCoverImageUrl?: string;
  deckBackgroundImageUrl?: string;
  themeId?: string;
  anonymousMode?: boolean;
  allowReJoin?: boolean;
  answerSubmissionMode?: "SIMULTANEOUS" | "TURN_BASED";
};
export type ScheduledInteractiveSessionResponse = {
  id?: string;
  hostUserId?: string;
  hostName?: string;
  deckId?: string;
  deckName?: string;
  settings?: InteractiveSessionSettings;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  reminderEmailTemplate?: string;
  invitedEmails?: string[];
  createdInteractiveSessionId?: string;
  status?: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
  createdAt?: string;
  updatedAt?: string;
};
export type UpdateScheduledInteractiveSessionRequest = {
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  settings?: InteractiveSessionSettings;
  reminderEmailTemplate?: string;
};
export type OrganizationPlanResponse = {
  tier?: "FREE" | "INDIVIDUAL" | "ORG_SEAT" | "ORG_TEAM" | "ORG_BUSINESS";
  status?: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "EXPIRED" | "NONE";
  seatLimit?: number;
  startedAt?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  featureFlags?: string[];
  monthlyInteractiveSessionLimit?: number;
  quotaResetsAt?: string;
};
export type StoredImageVariant = {
  size?: "XS" | "SM" | "MD" | "LG" | "XL";
  width?: number;
  height?: number;
};
export type OrganizationResponse = {
  id?: string;
  name?: string;
  ownerId?: string;
  plan?: OrganizationPlanResponse;
  description?: string;
  logoVariants?: StoredImageVariant[];
  websiteUrl?: string;
  location?: string;
  emailDomain?: string;
  inviteCode?: string;
  allowPublicJoin?: boolean;
  memberCount?: number;
  defaultThemeId?: string;
  createdAt?: string;
  updatedAt?: string;
};
export type UpdateOrganizationRequest = {
  name?: string;
  description?: string;
  websiteUrl?: string;
  location?: string;
  emailDomain?: string;
  allowPublicJoin?: boolean;
  defaultThemeId?: string;
};
export type UserSnapshot = {
  userId?: string;
  name?: string;
  pictureUrl?: string;
  guest?: boolean;
};
export type NotificationResponse = {
  id?: string;
  userId?: string;
  kind?:
    | "INTERACTIVE_SESSION_INVITE"
    | "INTERACTIVE_SESSION_STARTING_SOON"
    | "DECK_COMMENT"
    | "DECK_COMMENT_REPLY"
    | "DECK_RATING"
    | "DECK_FAVORITED"
    | "COLLAB_INVITE"
    | "COLLAB_ACCEPTED"
    | "ACHIEVEMENT"
    | "ORG_INVITE"
    | "ORG_JOINED"
    | "MENTION"
    | "SYSTEM";
  title?: string;
  body?: string;
  link?: string;
  iconUrl?: string;
  meta?: {
    [key: string]: string;
  };
  actor?: UserSnapshot;
  read?: boolean;
  createdAt?: string;
  readAt?: string;
};
export type UnreadNotificationCountResponse = {
  count?: number;
};
export type MediaAssetResponse = {
  id?: string;
  kind?: "IMAGE" | "AUDIO" | "VIDEO_FILE" | "VIDEO_EMBED";
  name?: string;
  ownerId?: string;
  organizationId?: string;
  variants?: {
    [key: string]: ImageVariant;
  };
  url?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  mimeType?: string;
  altText?: string;
  attribution?: string;
  sourceUrl?: string;
  tags?: string[];
  createdAt?: string;
};
export type UpdateMediaAssetRequest = {
  name?: string;
  tags?: string[];
  organizationId?: string;
  altText?: string;
  attribution?: string;
  sourceUrl?: string;
};
export type DeckElementBase = {
  kind: string;
};
export type McqOption = {
  id?: string;
  text?: string;
  image?: Image;
  color?: string;
};
export type ElementChrome = {
  publicKey?: string;
  privateKey?: string;
  title?: string;
  titleLabel?: string;
  styledTitle?: {
    [key: string]: object;
  };
  scored?: boolean;
  survey?: boolean;
  multipleSelections?: number;
  responseMode?: "ACCEPTING_RESPONSES" | "NOT_ACCEPTING_RESPONSES";
  displaySeconds?: number;
  speakerNotes?: string;
  background?: Image;
  image?: Image;
  videoUrl?: string;
  audioUrl?: string;
  videoAssetId?: string;
  audioAssetId?: string;
  mediaPosition?: "TOP" | "BOTTOM" | "BACKGROUND" | "NONE";
  bestAnswerMode?: boolean;
  bestAnswerTitle?: string;
  bestAnswerPoints?: number;
  bestAnswerScoring?: "POINTS_PER_VOTE" | "FLAT_WINNER";
  createdByUserId?: string;
  lastEditedByUserId?: string;
  createdAt?: string;
  updatedAt?: string;
  tagIds?: string[];
  mediaCaption?: string;
  altText?: string;
  reactionsEnabled?: boolean;
  version?: number;
};
export type AllocationQuestion = {
  kind: "AllocationQuestion";
} & DeckElementBase & {
    id?: string;
    prompt?: string;
    options?: McqOption[];
    totalPointsToDistribute?: number;
    allowZeroOnItem?: boolean;
    enforceExactTotal?: boolean;
    pointValue?: number;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    explanation?: string;
    chrome?: ElementChrome;
  };
export type DrawingQuestion = {
  kind: "DrawingQuestion";
} & DeckElementBase & {
    id?: string;
    prompt?: string;
    backingImage?: Image;
    canvasWidth?: number;
    canvasHeight?: number;
    maxStrokesPerPlayer?: number;
    maxPointsPerStroke?: number;
    palette?: string[];
    pointValue?: number;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    explanation?: string;
    chrome?: ElementChrome;
  };
export type GridCellsConfig = {
  labels?: string[];
  backingImage?: Image;
};
export type GridQuestion = {
  kind: "GridQuestion";
} & DeckElementBase & {
    id?: string;
    prompt?: string;
    rows?: number;
    cols?: number;
    cells?: GridCellsConfig;
    correctCellIndexes?: number[];
    multipleCorrect?: boolean;
    pointValue?: number;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    explanation?: string;
    chrome?: ElementChrome;
  };
export type MatchingPair = {
  id?: string;
  leftLabel?: string;
  rightLabel?: string;
  leftImage?: Image;
  rightImage?: Image;
};
export type MatchingQuestion = {
  kind: "MatchingQuestion";
} & DeckElementBase & {
    id?: string;
    prompt?: string;
    pairs?: MatchingPair[];
    scoring?: "ALL_OR_NOTHING" | "PARTIAL";
    pointValue?: number;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    explanation?: string;
    chrome?: ElementChrome;
  };
export type McqQuestion = {
  kind: "McqQuestion";
} & DeckElementBase & {
    id?: string;
    prompt?: string;
    options?: McqOption[];
    correctOptionIds?: string[];
    pointValue?: number;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    explanation?: string;
    shuffleOptions?: boolean;
    allowMultipleSelect?: boolean;
    maxSelections?: number;
    chrome?: ElementChrome;
  };
export type NumberQuestion = {
  kind: "NumberQuestion";
} & DeckElementBase & {
    id?: string;
    prompt?: string;
    correctValue?: number;
    tolerance?: number;
    unitLabel?: string;
    decimalPlaces?: number;
    pointValue?: number;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    explanation?: string;
    minValue?: number;
    maxValue?: number;
    allowNegative?: boolean;
    chrome?: ElementChrome;
  };
export type PlaceOnImageQuestion = {
  kind: "PlaceOnImageQuestion";
} & DeckElementBase & {
    id?: string;
    prompt?: string;
    targetImage?: Image;
    correctX?: number;
    correctY?: number;
    tolerance?: number;
    scoring?: "BINARY" | "LINEAR";
    pointValue?: number;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    explanation?: string;
    chrome?: ElementChrome;
  };
export type QAndAQuestion = {
  kind: "QAndAQuestion";
} & DeckElementBase & {
    id?: string;
    prompt?: string;
    maxSubmissionsPerPlayer?: number;
    allowVoting?: boolean;
    autoApprove?: boolean;
    pointValue?: number;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    explanation?: string;
    anonymousSubmissions?: boolean;
    minVotesToShow?: number;
    chrome?: ElementChrome;
  };
export type RankingItem = {
  id?: string;
  label?: string;
  image?: Image;
};
export type RankingQuestion = {
  kind: "RankingQuestion";
} & DeckElementBase & {
    id?: string;
    prompt?: string;
    items?: RankingItem[];
    correctOrder?: string[];
    scoring?: "EXACT" | "PARTIAL";
    pointValue?: number;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    explanation?: string;
    shuffleItemsForPresentation?: boolean;
    chrome?: ElementChrome;
  };
export type ScaleStatement = {
  id?: string;
  text?: string;
};
export type ScalesQuestion = {
  kind: "ScalesQuestion";
} & DeckElementBase & {
    id?: string;
    prompt?: string;
    statements?: ScaleStatement[];
    scaleMin?: number;
    scaleMax?: number;
    minLabel?: string;
    maxLabel?: string;
    correctRatings?: number[];
    pointValue?: number;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    explanation?: string;
    chrome?: ElementChrome;
  };
export type SlideBlock = {
  kind: string;
};
export type Slide = {
  kind: "Slide";
} & DeckElementBase & {
    id?: string;
    slideKind?: "TITLE" | "SECTION" | "CALLOUT" | "CONTENT" | "END";
    body?: string;
    blocks?: SlideBlock[];
    resultsDisplayType?:
      | "DEFAULT"
      | "BAR_HORIZONTAL"
      | "BAR_VERTICAL"
      | "WORD_CLOUD"
      | "PIE_CHART"
      | "HISTOGRAM";
    multipleSelectionsEnabled?: boolean;
    selectionsPerParticipant?: number;
    showResultsAsPercentage?: boolean;
    joinType?: "INSTRUCTIONS_BAR" | "QR_CODE";
    showJoinInformation?: boolean;
    showQrCode?: boolean;
    showResponses?: "INHERIT" | "INSTANT" | "ON_CLICK" | "PRIVATE";
    heading?: string;
    participantInformation?: {
      [key: string]: object;
    };
    autoAdvanceSeconds?: number;
    chrome?: ElementChrome;
  };
export type TextQuestion = {
  kind: "TextQuestion";
} & DeckElementBase & {
    id?: string;
    prompt?: string;
    correctAnswer?: string;
    acceptedVariants?: string[];
    caseSensitive?: boolean;
    pointValue?: number;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    explanation?: string;
    maxLength?: number;
    trimWhitespace?: boolean;
    fuzzyMatch?: boolean;
    fuzzyDistance?: number;
    chrome?: ElementChrome;
  };
export type WordCloudQuestion = {
  kind: "WordCloudQuestion";
} & DeckElementBase & {
    id?: string;
    prompt?: string;
    maxSubmissionsPerPlayer?: number;
    maxWordLength?: number;
    caseSensitive?: boolean;
    profanityFilter?: boolean;
    bannedWords?: string[];
    pointValue?: number;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    explanation?: string;
    chrome?: ElementChrome;
  };
export type PublicUserSnapshot = {
  name?: string;
  pictureUrl?: string;
  guest?: boolean;
};
export type Avatar = {
  avatarType?: "KEY" | "LINK";
  avatarUrl?: string;
  avatarKey?: string;
};
export type InteractiveSessionPlayerResponse = {
  playerId: string;
  user: PublicUserSnapshot;
  score: number;
  teamId?: string;
  avatar: Avatar;
  colorTag?: string;
  currentStreak: number;
  longestStreak: number;
  accuracy: number;
  reactionsSent: number;
  speedBonusTotal: number;
  lateJoin: boolean;
  disconnected: boolean;
  lastSeenAt?: string;
};
export type Team = {
  id?: string;
  name?: string;
  color?: string;
  captainPlayerId?: string;
  score?: number;
  memberCount?: number;
};
export type InteractiveSessionResponse = {
  id: string;
  roomCode: string;
  inviteToken: string;
  status: "LOBBY" | "IN_PROGRESS" | "RESULTS" | "FINISHED" | "CANCELLED";
  phase: "SUBMIT" | "VOTE" | "REVEAL";
  format: "GAME" | "PRESENTATION";
  hostPlayerId: string;
  hostName: string;
  hostAvatarUrl?: string;
  deckId: string;
  deckVersion: number;
  deckSnapshot: (
    | AllocationQuestion
    | DrawingQuestion
    | GridQuestion
    | MatchingQuestion
    | McqQuestion
    | NumberQuestion
    | PlaceOnImageQuestion
    | QAndAQuestion
    | RankingQuestion
    | ScalesQuestion
    | Slide
    | TextQuestion
    | WordCloudQuestion
  )[];
  settings: InteractiveSessionSettings;
  players: InteractiveSessionPlayerResponse[];
  teams: Team[];
  customRoomCode?: string;
  spectatorCount: number;
  lobbyOpenedAt: string;
  currentRound: number;
  totalRounds: number;
  revealedElementIds: string[];
  elementResponseModeOverrides: {
    [key: string]: "ACCEPTING_RESPONSES" | "NOT_ACCEPTING_RESPONSES";
  };
  viewerPlayerId?: string;
  createdAt: string;
  startedAt?: string;
  timerPaused: boolean;
  timerRemainingMillis?: number;
};
export type TeamCrudRequest = {
  name?: string;
  color?: string;
};
export type TeamMoveRequest = {
  teamId: string;
};
export type InteractiveSessionChatMessageResponse = {
  id?: string;
  authorPlayerId?: string;
  author?: PublicUserSnapshot;
  fromHost?: boolean;
  body?: string;
  sentAt?: string;
  moderated?: boolean;
  moderatedByPlayerId?: string;
  moderatedAt?: string;
};
export type GalleryImageResponse = {
  id?: string;
  name?: string;
  ownerId?: string;
  organizationId?: string;
  tags?: string[];
  variants?: {
    [key: string]: ImageVariant;
  };
  createdAt?: string;
};
export type UpdateGalleryImageRequest = {
  name?: string;
  tags?: string[];
  organizationId?: string;
};
export type DeckResponse = {
  id?: string;
  name?: string;
  description?: string;
  creatorUserId?: string;
  organizationId?: string;
  tags?: string[];
  tagIds?: string[];
  subjectTagId?: string;
  isSystem?: boolean;
  visibility?: "PRIVATE" | "UNLISTED" | "ORG" | "PUBLIC";
  defaultSessionFormat?: "GAME" | "PRESENTATION";
  defaultShowResponses?: "INHERIT" | "INSTANT" | "ON_CLICK" | "PRIVATE";
  cover?: Image;
  background?: Image;
  themeId?: string;
  defaultSettings?: InteractiveSessionSettings;
  estimatedDurationMinutes?: number;
  elementCount?: number;
  elements?: (
    | AllocationQuestion
    | DrawingQuestion
    | GridQuestion
    | MatchingQuestion
    | McqQuestion
    | NumberQuestion
    | PlaceOnImageQuestion
    | QAndAQuestion
    | RankingQuestion
    | ScalesQuestion
    | Slide
    | TextQuestion
    | WordCloudQuestion
  )[];
  parentDeckId?: string;
  originalAuthorUserId?: string;
  publishStatus?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt?: string;
  language?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  ageRange?: string;
  license?: "ALL_RIGHTS_RESERVED" | "CC_BY" | "CC_BY_SA" | "CC_BY_NC" | "CC0";
  playCount?: number;
  viewCount?: number;
  favoriteCount?: number;
  isFavorited?: boolean;
  averageRating?: number;
  ratingCount?: number;
  myRating?: number;
  isRatedByMe?: boolean;
  myRole?: "VIEWER" | "EDITOR" | "OWNER";
  lastPlayedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};
export type UpdateDeckRequest = {
  name?: string;
  description?: string;
  tags?: string[];
  tagIds?: string[];
  subjectTagId?: string;
  visibility?: "PRIVATE" | "UNLISTED" | "ORG" | "PUBLIC";
  defaultSessionFormat?: "GAME" | "PRESENTATION";
  defaultShowResponses?: "INHERIT" | "INSTANT" | "ON_CLICK" | "PRIVATE";
  defaultSettings?: InteractiveSessionSettings;
  cover?: Image;
  background?: Image;
  themeId?: string;
  estimatedDurationMinutes?: number;
  language?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  ageRange?: string;
  license?: "ALL_RIGHTS_RESERVED" | "CC_BY" | "CC_BY_SA" | "CC_BY_NC" | "CC0";
};
export type DeckRatingResponse = {
  id?: string;
  deckId?: string;
  user?: UserSnapshot;
  stars?: number;
  review?: string;
  createdAt?: string;
  updatedAt?: string;
};
export type RateDeckRequest = {
  stars?: number;
  review?: string;
};
export type DeckCollaboratorResponse = {
  id?: string;
  deckId?: string;
  email?: string;
  user?: UserSnapshot;
  userName?: string;
  role?: "VIEWER" | "EDITOR" | "OWNER";
  invitedByUserId?: string;
  invitedAt?: string;
  acceptedAt?: string;
};
export type UpdateCollaboratorRoleRequest = {
  role: "VIEWER" | "EDITOR" | "OWNER";
};
export type DeckCommentResponse = {
  id?: string;
  deckId?: string;
  author?: UserSnapshot;
  parentCommentId?: string;
  body?: string;
  upvotes?: number;
  upvotedByMe?: boolean;
  edited?: boolean;
  deleted?: boolean;
  replyCount?: number;
  createdAt?: string;
  updatedAt?: string;
};
export type UpdateCommentRequest = {
  body: string;
};
export type DeckCollectionResponse = {
  id?: string;
  ownerUserId?: string;
  organizationId?: string;
  name?: string;
  description?: string;
  cover?: Image;
  deckIds?: string[];
  visibility?: "PRIVATE" | "UNLISTED" | "ORG" | "PUBLIC";
  viewCount?: number;
  deckCount?: number;
  decks?: DeckResponse[];
  createdAt?: string;
  updatedAt?: string;
};
export type UpdateDeckCollectionRequest = {
  name?: string;
  description?: string;
  visibility?: "PRIVATE" | "UNLISTED" | "ORG" | "PUBLIC";
  cover?: Image;
};
export type ExternalIdentity = {
  provider?: string;
  id?: string;
};
export type PlayerStats = {
  gamesPlayed?: number;
  highScore?: number;
  totalPoints?: number;
  dailyLoginStreak?: number;
  longestStreak?: number;
  perfectGames?: number;
  totalReactionsSent?: number;
  presentedByKind?: {
    [key: string]: number;
  };
  correctByKind?: {
    [key: string]: number;
  };
  weeklyPoints?: number;
  monthlyPoints?: number;
  weeklyPointsResetAt?: string;
  monthlyPointsResetAt?: string;
  lastPlayedAt?: string;
};
export type BillingState = {
  tier?: "FREE" | "INDIVIDUAL" | "ORG_SEAT" | "ORG_TEAM" | "ORG_BUSINESS";
  status?: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "EXPIRED" | "NONE";
  startedAt?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
};
export type Membership = {
  billing?: BillingState;
  sourceOrganizationId?: string;
  monthlyInteractiveSessionCount?: number;
  monthlyCountPeriodStart?: string;
  featureFlags?: string[];
  monthlyInteractiveSessionLimit?: number;
  quotaResetsAt?: string;
};
export type RegisteredUser = {
  id?: string;
  email?: string;
  name?: string;
  userName?: string;
  isGuest?: boolean;
  externalIdentity?: ExternalIdentity;
  pictureUrl?: string;
  picture?: Image;
  stats?: PlayerStats;
  membership?: Membership;
  newsletter?: boolean;
  organizationIds?: string[];
  activeThemeId?: string;
  timezone?: string;
  emailVerifiedAt?: string;
  lastLogin?: string;
  createdAt?: string;
};
export type CreateThemeRequest = {
  name?: string;
  huePrimary?: number;
  hueAccent?: number;
  mode?: "LIGHT" | "DARK" | "SYSTEM";
  organizationId?: string;
};
export type CreateTagRequest = {
  id?: string;
  displayName: string;
  parentTagId?: string;
  description?: string;
  iconUrl?: string;
  curated?: boolean;
};
export type CreateScheduledInteractiveSessionRequest = {
  deckId: string;
  scheduledStartAt: string;
  scheduledEndAt?: string;
  settings?: InteractiveSessionSettings;
  reminderEmailTemplate?: string;
  invitedEmails?: string[];
};
export type InteractiveSessionInviteResponse = {
  id?: string;
  email?: string;
  resolvedUserId?: string;
  sentAt?: string;
  redeemedAt?: string;
  expiresAt?: string;
};
export type AddInviteRequest = {
  email: string;
};
export type UnsubscribeResponse = {
  email?: string;
  category?: string;
};
export type CreateOrganizationRequest = {
  name?: string;
};
export type JoinOrganizationRequest = {
  organizationId?: string;
};
export type JoinByCodeRequest = {
  inviteCode?: string;
};
export type CreateEmbedRequest = {
  url?: string;
  name?: string;
  tags?: string[];
  organizationId?: string;
};
export type RedeemInviteResponse = {
  scheduledInteractiveSessionId?: string;
  interactiveSessionId?: string;
  roomCode?: string;
  deckName?: string;
  hostName?: string;
  scheduledStartAt?: string;
};
export type CreateInteractiveSessionRequest = {
  deckId: string;
  format?: "GAME" | "PRESENTATION";
  answerSubmissionMode?: "SIMULTANEOUS" | "TURN_BASED";
  showResponses?: "INHERIT" | "INSTANT" | "ON_CLICK" | "PRIVATE";
  totalRounds?: number;
  timePerQuestion?: number;
  speedBonus?: boolean;
  allowGuests?: boolean;
  maxPlayers?: number;
  allowLateJoin?: boolean;
  showScoresImmediately?: boolean;
  scoringEnabled?: boolean;
  reactionsEnabled?: boolean;
  chatEnabled?: boolean;
  teamMode?: boolean;
  teamCount?: number;
  autoBalanceTeams?: boolean;
  customRoomCode?: string;
  anonymousMode?: boolean;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  autoAdvance?: boolean;
  podiumDuration?: number;
  lobbyCountdownSeconds?: number;
  requireFullName?: boolean;
  spectatorsAllowed?: boolean;
};
export type Reaction = {
  id?: string;
  interactiveSessionId?: string;
  elementId?: string;
  playerId?: string;
  user?: UserSnapshot;
  emoji?: string;
  offsetMs?: number;
  sentAt?: string;
};
export type ReactionSendRequest = {
  emoji: string;
};
export type JoinInteractiveSessionRequest = {
  teamId?: string;
};
export type ChatSendRequest = {
  body: string;
};
export type CreateDeckRequest = {
  id?: string;
  name: string;
  description?: string;
  tags?: string[];
  tagIds?: string[];
  subjectTagId?: string;
  visibility?: "PRIVATE" | "UNLISTED" | "ORG" | "PUBLIC";
  defaultSessionFormat?: "GAME" | "PRESENTATION";
  defaultShowResponses?: "INHERIT" | "INSTANT" | "ON_CLICK" | "PRIVATE";
  cover?: Image;
  background?: Image;
  themeId?: string;
  estimatedDurationMinutes?: number;
  language?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  ageRange?: string;
  license?: "ALL_RIGHTS_RESERVED" | "CC_BY" | "CC_BY_SA" | "CC_BY_NC" | "CC0";
};
export type DeckFavoriteResponse = {
  deckId?: string;
  isFavorited?: boolean;
  favoriteCount?: number;
};
export type PageDeckCommentResponse = {
  items?: DeckCommentResponse[];
  page?: number;
  size?: number;
  totalElements?: number;
  hasMore?: boolean;
};
export type CreateCommentRequest = {
  body: string;
  parentCommentId?: string;
};
export type InviteCollaboratorRequest = {
  userIdOrEmail: string;
  role: "VIEWER" | "EDITOR" | "OWNER";
};
export type TransferOwnershipRequest = {
  userId: string;
};
export type CreateDeckCollectionRequest = {
  id?: string;
  name: string;
  description?: string;
  organizationId?: string;
  visibility?: "PRIVATE" | "UNLISTED" | "ORG" | "PUBLIC";
  cover?: Image;
};
export type AddDeckToCollectionRequest = {
  deckId: string;
  position?: number;
};
export type ReorderCollectionDecksRequest = {
  deckIds: string[];
};
export type RegisterRequest = {
  username: string;
  newsletter?: boolean;
};
export type GuestUser = {
  id?: string;
  userName?: string;
  isGuest?: boolean;
  pictureUrl?: string;
  picture?: Image;
  stats?: PlayerStats;
};
export type GuestLoginRequest = {
  username?: string;
};
export type UpdateProfileRequest = {
  pictureUrl?: string;
  newsletter?: boolean;
  activeThemeId?: string;
  timezone?: string;
};
export type GameHistoryResponse = {
  id?: string;
  interactiveSessionId?: string;
  deckId?: string;
  deckName?: string;
  host?: UserSnapshot;
  finalScore?: number;
  placement?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  longestStreak?: number;
  currentStreakAtEnd?: number;
  accuracy?: number;
  reactionsSent?: number;
  durationMs?: number;
  teamId?: string;
  teamName?: string;
  wasHost?: boolean;
  wasGuest?: boolean;
  playedAt?: string;
};
export type PageGameHistoryResponse = {
  items?: GameHistoryResponse[];
  page?: number;
  size?: number;
  totalElements?: number;
  hasMore?: boolean;
};
export type UserAchievementResponse = {
  id?: string;
  name?: string;
  description?: string;
  iconUrl?: string;
  category?: string;
  trigger?:
    | "FIRST_GAME"
    | "GAMES_PLAYED"
    | "TOTAL_POINTS"
    | "HIGH_SCORE"
    | "STREAK"
    | "PERFECT_GAME"
    | "HOST_GAMES"
    | "DECKS_CREATED"
    | "DECKS_PUBLISHED"
    | "FAVORITES_RECEIVED";
  threshold?: number;
  rewardPoints?: number;
  hidden?: boolean;
  displayOrder?: number;
  earned?: boolean;
  earnedAt?: string;
  earnedInInteractiveSessionId?: string;
  earnedInDeckId?: string;
  currentProgress?: number;
};
export type UserAchievementsPage = {
  items?: UserAchievementResponse[];
  earnedCount?: number;
  totalCount?: number;
};
export type PageDeckResponse = {
  items?: DeckResponse[];
  page?: number;
  size?: number;
  totalElements?: number;
  hasMore?: boolean;
};
export type PageNotificationResponse = {
  items?: NotificationResponse[];
  page?: number;
  size?: number;
  totalElements?: number;
  hasMore?: boolean;
};
export type PlayerEndStats = {
  longestStreak?: number;
  accuracy?: number;
  reactionsSent?: number;
};
export type PlayerPlacementResponse = {
  playerId?: string;
  user?: PublicUserSnapshot;
  finalScore?: number;
  placement?: number;
  correctAnswers?: number;
  totalQuestions?: number;
  teamId?: string;
  endStats?: PlayerEndStats;
  speedBonusTotal?: number;
};
export type AnswerPayloadBase = {
  kind: string;
};
export type AllocationAnswer = {
  kind: "AllocationAnswer";
} & AnswerPayloadBase & {
    optionIdToPoints?: {
      [key: string]: number;
    };
  };
export type Stroke = {
  color?: string;
  thickness?: number;
  points?: number[];
};
export type DrawingAnswer = {
  kind: "DrawingAnswer";
} & AnswerPayloadBase & {
    strokes?: Stroke[];
  };
export type GridAnswer = {
  kind: "GridAnswer";
} & AnswerPayloadBase & {
    selectedCellIndexes?: number[];
  };
export type MatchingAnswer = {
  kind: "MatchingAnswer";
} & AnswerPayloadBase & {
    leftIdToRightId?: {
      [key: string]: string;
    };
  };
export type McqAnswer = {
  kind: "McqAnswer";
} & AnswerPayloadBase & {
    optionIds?: string[];
  };
export type NumberAnswer = {
  kind: "NumberAnswer";
} & AnswerPayloadBase & {
    value?: number;
  };
export type PlaceOnImageAnswer = {
  kind: "PlaceOnImageAnswer";
} & AnswerPayloadBase & {
    x?: number;
    y?: number;
  };
export type RankingAnswer = {
  kind: "RankingAnswer";
} & AnswerPayloadBase & {
    orderedItemIds?: string[];
  };
export type ScalesAnswer = {
  kind: "ScalesAnswer";
} & AnswerPayloadBase & {
    ratings?: {
      [key: string]: number;
    };
  };
export type TextAnswer = {
  kind: "TextAnswer";
} & AnswerPayloadBase & {
    text?: string;
  };
export type TimeoutAnswer = {
  kind: "TimeoutAnswer";
} & AnswerPayloadBase;
export type WordCloudAnswer = {
  kind: "WordCloudAnswer";
} & AnswerPayloadBase & {
    words?: string[];
  };
export type PlayerRoundResponse = {
  playerId?: string;
  userName?: string;
  payload?:
    | AllocationAnswer
    | DrawingAnswer
    | GridAnswer
    | MatchingAnswer
    | McqAnswer
    | NumberAnswer
    | PlaceOnImageAnswer
    | RankingAnswer
    | ScalesAnswer
    | TextAnswer
    | TimeoutAnswer
    | WordCloudAnswer;
  wasCorrect?: boolean;
  pointsAwarded?: number;
  totalScore?: number;
};
export type RoundReview = {
  round?: number;
  element?:
    | AllocationQuestion
    | DrawingQuestion
    | GridQuestion
    | MatchingQuestion
    | McqQuestion
    | NumberQuestion
    | PlaceOnImageQuestion
    | QAndAQuestion
    | RankingQuestion
    | ScalesQuestion
    | Slide
    | TextQuestion
    | WordCloudQuestion;
  timedOutCount?: number;
  playerAnswers?: PlayerRoundResponse[];
};
export type InteractiveSessionReviewResponse = {
  interactiveSessionId?: string;
  roomCode?: string;
  endedAt?: string;
  scoringEnabled?: boolean;
  placements?: PlayerPlacementResponse[];
  rounds?: RoundReview[];
};
export type InteractiveSessionResultResponse = {
  id?: string;
  interactiveSessionId?: string;
  placements?: PlayerPlacementResponse[];
  endedAt?: string;
};
export type HealthCheckResponse = {
  status?: string;
  message?: string;
  timestamp?: string;
  database?: string;
  redis?: string;
};
export type DeckRatingsPage = {
  items?: DeckRatingResponse[];
  page?: number;
  size?: number;
  totalElements?: number;
  hasMore?: boolean;
  averageRating?: number;
  ratingCount?: number;
  starDistribution?: number[];
};
export type ElementStats = {
  presentedCount?: number;
  answeredCount?: number;
  correctCount?: number;
  totalTimeMs?: number;
  averageTimeMs?: number;
  distribution?: {
    [key: string]: number;
  };
  reactionsReceived?: number;
  chatMessagesDuringRound?: number;
};
export type FormatRollup = {
  sessionCount?: number;
  participantCount?: number;
  averageScore?: number;
  averageAccuracy?: number;
  averageDurationMs?: number;
  lastRunAt?: string;
};
export type DeckAnalytics = {
  createdAt?: string;
  updatedAt?: string;
  deckId?: string;
  totalPlays?: number;
  totalPlayers?: number;
  averageScore?: number;
  averageAccuracy?: number;
  averageDurationMs?: number;
  perElement?: {
    [key: string]: ElementStats;
  };
  gameRollup?: FormatRollup;
  presentationRollup?: FormatRollup;
  lastPlayedAt?: string;
};
export type PageDeckCollectionResponse = {
  items?: DeckCollectionResponse[];
  page?: number;
  size?: number;
  totalElements?: number;
  hasMore?: boolean;
};
export type UserResponse = GuestUser | RegisteredUser;
export type AchievementResponse = {
  id?: string;
  name?: string;
  description?: string;
  iconUrl?: string;
  category?: string;
  trigger?:
    | "FIRST_GAME"
    | "GAMES_PLAYED"
    | "TOTAL_POINTS"
    | "HIGH_SCORE"
    | "STREAK"
    | "PERFECT_GAME"
    | "HOST_GAMES"
    | "DECKS_CREATED"
    | "DECKS_PUBLISHED"
    | "FAVORITES_RECEIVED";
  threshold?: number;
  rewardPoints?: number;
  hidden?: boolean;
  displayOrder?: number;
};
export const {
  useGetNotificationPrefsQuery,
  useLazyGetNotificationPrefsQuery,
  useUpdateNotificationPrefsMutation,
  useUpdateThemeMutation,
  useDeleteThemeMutation,
  useGetTagQuery,
  useLazyGetTagQuery,
  useUpdateTagMutation,
  useDeleteTagMutation,
  useGetScheduledSessionQuery,
  useLazyGetScheduledSessionQuery,
  useUpdateScheduledSessionMutation,
  useUpdateOrgMutation,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetMediaQuery,
  useLazyGetMediaQuery,
  useUpdateMediaMutation,
  useDeleteMediaMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
  useMovePlayerToTeamMutation,
  useModerateChatMutation,
  useUpdateImageMutation,
  useDeleteImageMutation,
  useGetDeckQuery,
  useLazyGetDeckQuery,
  useUpdateDeckMutation,
  useDeleteDeckMutation,
  useRateDeckMutation,
  useDeleteMyRatingMutation,
  useUpdateElementMutation,
  useDeleteElementMutation,
  useUpdateCollaboratorRoleMutation,
  useRemoveCollaboratorMutation,
  useEditCommentMutation,
  useDeleteCommentMutation,
  useGetCollectionQuery,
  useLazyGetCollectionQuery,
  useUpdateCollectionMutation,
  useDeleteCollectionMutation,
  useUploadProfileImageMutation,
  useCloseAccountMutation,
  useListThemesQuery,
  useLazyListThemesQuery,
  useCreateThemeMutation,
  useUploadLogoMutation,
  useUploadBackgroundMutation,
  useListTagsQuery,
  useLazyListTagsQuery,
  useCreateTagMutation,
  useCreateScheduledSessionMutation,
  useAddScheduledInviteMutation,
  useCancelScheduledSessionMutation,
  useUnsubscribeGetQuery,
  useLazyUnsubscribeGetQuery,
  useUnsubscribeMutation,
  useCreateOrgMutation,
  useRotateInviteCodeMutation,
  useJoinOrgMutation,
  useJoinByCodeMutation,
  useListMediaQuery,
  useLazyListMediaQuery,
  useUploadMediaMutation,
  useCreateMediaEmbedMutation,
  useRedeemInviteMutation,
  useCreateInteractiveSessionMutation,
  useCreateTeamMutation,
  useSendReactionMutation,
  useJoinByRoomCodeMutation,
  useListChatQuery,
  useLazyListChatQuery,
  useSendChatMutation,
  useListImagesQuery,
  useLazyListImagesQuery,
  useUploadImageMutation,
  useListDecksQuery,
  useLazyListDecksQuery,
  useCreateDeckMutation,
  useUnpublishDeckMutation,
  usePublishDeckMutation,
  useFavoriteDeckMutation,
  useUnfavoriteDeckMutation,
  useRecountFavoritesMutation,
  useAddElementMutation,
  useMoveMcqOptionMutation,
  useMoveElementMutation,
  useListCommentsQuery,
  useLazyListCommentsQuery,
  usePostCommentMutation,
  useListCollaboratorsQuery,
  useLazyListCollaboratorsQuery,
  useInviteCollaboratorMutation,
  useTransferOwnershipMutation,
  useArchiveDeckMutation,
  useToggleCommentUpvoteMutation,
  useCreateCollectionMutation,
  useAddDeckToCollectionMutation,
  useReorderCollectionDecksMutation,
  useRegisterMutation,
  useGuestLoginMutation,
  useUpdateProfileMutation,
  useListUserHistoryQuery,
  useLazyListUserHistoryQuery,
  useListAchievementsForUserQuery,
  useLazyListAchievementsForUserQuery,
  useGetUserProfileQuery,
  useLazyGetUserProfileQuery,
  useListMyHistoryQuery,
  useLazyListMyHistoryQuery,
  useListMyFavoritesQuery,
  useLazyListMyFavoritesQuery,
  useListMyAchievementsQuery,
  useLazyListMyAchievementsQuery,
  useGetLeaderboardQuery,
  useLazyGetLeaderboardQuery,
  useCheckUsernameQuery,
  useLazyCheckUsernameQuery,
  useListScheduledInvitesQuery,
  useLazyListScheduledInvitesQuery,
  useListMyScheduledSessionsQuery,
  useLazyListMyScheduledSessionsQuery,
  useListMyOrgsQuery,
  useLazyListMyOrgsQuery,
  useListNotificationsQuery,
  useLazyListNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useLazyGetUnreadNotificationCountQuery,
  useGetInteractiveSessionQuery,
  useLazyGetInteractiveSessionQuery,
  useCancelInteractiveSessionMutation,
  useGetReviewQuery,
  useLazyGetReviewQuery,
  useGetResultsQuery,
  useLazyGetResultsQuery,
  useGetByInviteTokenQuery,
  useLazyGetByInviteTokenQuery,
  useGetHealthQuery,
  useLazyGetHealthQuery,
  useListRatingsQuery,
  useLazyListRatingsQuery,
  useGetMyRatingQuery,
  useLazyGetMyRatingQuery,
  useGetDeckAnalyticsQuery,
  useLazyGetDeckAnalyticsQuery,
  useGetDeckAnalyticsCsvQuery,
  useLazyGetDeckAnalyticsCsvQuery,
  useListMyHistoryForDeckQuery,
  useLazyListMyHistoryForDeckQuery,
  useListRepliesQuery,
  useLazyListRepliesQuery,
  useListMyDecksQuery,
  useLazyListMyDecksQuery,
  useExploreDecksQuery,
  useLazyExploreDecksQuery,
  useListMyCollectionsQuery,
  useLazyListMyCollectionsQuery,
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
  useLoginQuery,
  useLazyLoginQuery,
  useListCatalogQuery,
  useLazyListCatalogQuery,
  useLeaveOrgMutation,
  useDismissNotificationMutation,
  useRemoveDeckFromCollectionMutation,
} = injectedRtkApi;
