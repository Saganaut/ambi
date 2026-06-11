import { useGetDeckQuery } from "@/features/deck/store/deckApi.gen";
import {
  useGetDeckReviewSummaryQuery,
  useListDeckReviewsQuery,
  useGetMyReviewQuery,
  useRateDeckMutation,
  useDeleteMyReviewMutation,
  DeckReviewResponse,
} from "@/features/deck/store/reviewApi.gen";
import { sharedValidation } from "@/shared/store/sharedValidationConstants";
import { Dispatch, SetStateAction, useState } from "react";

const PAGE_SIZE = 10;
export const REVIEW_BODY_MAX = sharedValidation.RateDeckRequest.body.maxLength;

interface UseReviewsProps {
  deckId: string;
}

interface UseReviewsResult {
  canReview: boolean;
  average: number | null;
  count: number;
  distribution: number[];
  reviews: DeckReviewResponse[];
  pageCount: number;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  isLoading: boolean;
  myReview: DeckReviewResponse | null;
  saving: boolean;
  clearing: boolean;
  submit: (stars: number, body: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const useReviews = ({ deckId }: UseReviewsProps): UseReviewsResult => {
  const [page, setPage] = useState(0);

  const { data: deck } = useGetDeckQuery({ id: deckId });
  // A deck's own editor/owner cannot review it (the backend 403s); hide the
  // editor for them. Everyone with VIEW still sees the summary and the list.
  const canReview = deck != null && !deck.permissions.canEdit;

  const summaryQuery = useGetDeckReviewSummaryQuery({ deckId });
  const listQuery = useListDeckReviewsQuery({
    deckId,
    pageable: { page, size: PAGE_SIZE },
  });
  const myReviewQuery = useGetMyReviewQuery({ deckId }, { skip: !canReview });

  const [rateDeck, { isLoading: saving }] = useRateDeckMutation();
  const [deleteMyReview, { isLoading: clearing }] = useDeleteMyReviewMutation();

  const refresh = async () => {
    await Promise.all([
      summaryQuery.refetch(),
      listQuery.refetch(),
      canReview ? myReviewQuery.refetch() : Promise.resolve(),
    ]);
  };

  const submit = async (stars: number, body: string) => {
    const trimmed = body.trim();
    await rateDeck({
      deckId,
      rateDeckRequest: { stars, body: trimmed === "" ? undefined : trimmed },
    }).unwrap();
    setPage(0); // a fresh review lands at the top of page 0
    await refresh();
  };

  const clear = async () => {
    await deleteMyReview({ deckId }).unwrap();
    await refresh();
  };

  const summary = summaryQuery.data;
  return {
    canReview,
    average: summary?.average ?? null,
    count: summary?.count ?? 0,
    distribution: summary?.distribution ?? [0, 0, 0, 0, 0],
    reviews: listQuery.data?.content ?? [],
    pageCount: listQuery.data?.page?.totalPages ?? 0,
    page,
    setPage,
    isLoading: listQuery.isLoading,
    myReview: myReviewQuery.data ?? null,
    saving,
    clearing,
    submit,
    clear,
  };
};
