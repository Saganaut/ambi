import { emptySplitApi as api } from "../../../shared/store/emptyApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
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
  }),
  overrideExisting: false,
});
export { injectedRtkApi as commentApi };
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
export type AuthorResponse = {
  userId: string;
  name: string;
  avatar?: Avatar;
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
export type PageMetadata = {
  size?: number;
  number?: number;
  totalElements?: number;
  totalPages?: number;
};
export type PagedModelCommentThreadResponse = {
  content?: CommentThreadResponse[];
  page?: PageMetadata;
};
export type Pageable = {
  page?: number;
  size?: number;
  sort?: string[];
};
export type CommentBodyRequest = {
  body: string;
};
export type SetThreadStatusRequest = {
  status: "OPEN" | "RESOLVED";
};
export const {
  useListSlideCommentThreadsQuery,
  useLazyListSlideCommentThreadsQuery,
  useCreateCommentThreadMutation,
  useAddThreadCommentMutation,
  useSetThreadStatusMutation,
  useDeleteThreadCommentMutation,
  useUpdateThreadCommentMutation,
} = injectedRtkApi;
