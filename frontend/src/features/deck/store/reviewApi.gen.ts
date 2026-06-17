import { emptySplitApi as api } from "../../../shared/store/emptyApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    listDeckReviews: build.query<
      ListDeckReviewsApiResponse,
      ListDeckReviewsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.deckId}/reviews`,
        params: {
          pageable: queryArg.pageable,
        },
      }),
    }),
    rateDeck: build.mutation<RateDeckApiResponse, RateDeckApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.deckId}/reviews`,
        method: "PUT",
        body: queryArg.rateDeckRequest,
      }),
    }),
    getDeckReviewSummary: build.query<
      GetDeckReviewSummaryApiResponse,
      GetDeckReviewSummaryApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.deckId}/reviews/summary`,
      }),
    }),
    getMyReview: build.query<GetMyReviewApiResponse, GetMyReviewApiArg>({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.deckId}/reviews/mine`,
      }),
    }),
    deleteMyReview: build.mutation<
      DeleteMyReviewApiResponse,
      DeleteMyReviewApiArg
    >({
      query: (queryArg) => ({
        url: `/api/decks/${queryArg.deckId}/reviews/mine`,
        method: "DELETE",
      }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as reviewApi };
export type ListDeckReviewsApiResponse =
  /** status 200 OK */ PagedModelDeckReviewResponse;
export type ListDeckReviewsApiArg = {
  deckId: string;
  pageable: Pageable;
};
export type RateDeckApiResponse = /** status 200 OK */ DeckReviewResponse;
export type RateDeckApiArg = {
  deckId: string;
  rateDeckRequest: RateDeckRequest;
};
export type GetDeckReviewSummaryApiResponse =
  /** status 200 OK */ DeckReviewSummaryResponse;
export type GetDeckReviewSummaryApiArg = {
  deckId: string;
};
export type GetMyReviewApiResponse = /** status 200 OK */ DeckReviewResponse;
export type GetMyReviewApiArg = {
  deckId: string;
};
export type DeleteMyReviewApiResponse = unknown;
export type DeleteMyReviewApiArg = {
  deckId: string;
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
export type AuthorResponse = {
  userId: string;
  name: string;
  avatar?: Avatar;
};
export type DeckReviewResponse = {
  id: string;
  author: AuthorResponse;
  stars: number;
  body?: string;
  mine: boolean;
};
export type PageMetadata = {
  size?: number;
  number?: number;
  totalElements?: number;
  totalPages?: number;
};
export type PagedModelDeckReviewResponse = {
  content?: DeckReviewResponse[];
  page?: PageMetadata;
};
export type Pageable = {
  page?: number;
  size?: number;
  sort?: string[];
};
export type RateDeckRequest = {
  stars?: number;
  body?: string;
};
export type DeckReviewSummaryResponse = {
  average?: number;
  count: number;
  distribution: number[];
};
export const {
  useListDeckReviewsQuery,
  useLazyListDeckReviewsQuery,
  useRateDeckMutation,
  useGetDeckReviewSummaryQuery,
  useLazyGetDeckReviewSummaryQuery,
  useGetMyReviewQuery,
  useLazyGetMyReviewQuery,
  useDeleteMyReviewMutation,
} = injectedRtkApi;
