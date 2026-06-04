// Reviews panel for the deck-editor right sidebar. Renders the rating
// histogram, the caller's own star input, and a paginated list of written
// reviews. Anyone with read access to the deck sees the histogram + reviews;
// signed-in non-owners can submit, edit, or clear their own rating from the
// "Your rating" card.
import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { useGetDeckQuery } from "@store/AmbiApi";
import { Btn } from "@ui/Buttons/Btn";
import { Pagination } from "@ui/Pagination/Pagination";
import { StarRating } from "@ui/StarRating/StarRating";
import { resolveAvatarSrc } from "@utils/avatarUrl";
import styles from "./DeckReviewsPanel.module.css";
import { useCurrentUser } from "@/features/auth";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");
const PAGE_SIZE = 10;

const DeckReviewsPanel = () => {
  const { deckId } = routeApi.useParams();
  const currentUser = useCurrentUser();
  const isRegistered = currentUser.state === "registered";

  const { data: deck } = useGetDeckQuery({ id: deckId });
  const [page, setPage] = useState(0);
  const { data: ratings, isFetching } = useListRatingsQuery({
    id: deckId,
    page,
    size: PAGE_SIZE,
  });
  // Fetch the caller's own row separately so we can pre-populate the textarea
  // even when the row isn't on page 0 of the listing. 404 (no rating yet) is
  // expected and lands as an isError state — we treat that as "no review".
  const myRatingQuery = useGetMyRatingQuery(
    { id: deckId },
    { skip: !isRegistered },
  );
  const myRating = myRatingQuery.data;
  const [rateDeck, rateStatus] = useRateDeckMutation();
  const [deleteMyRating, deleteStatus] = useDeleteMyRatingMutation();

  // null = the user hasn't touched the textarea this session; mirror the
  // persisted review until they do. Once they type, the draft takes over.
  const [reviewDraft, setReviewDraft] = useState<string | null>(null);
  const [lastSyncedReview, setLastSyncedReview] = useState<string | null>(null);
  const persistedReview = myRating?.review ?? "";
  // Same set-state-during-render pattern the deck editor uses: re-sync the
  // draft whenever the server-side review text changes (initial load, after
  // a successful save, or after deleteMyRating clears it).
  if (lastSyncedReview !== persistedReview) {
    setLastSyncedReview(persistedReview);
    setReviewDraft(persistedReview);
  }

  if (!deck) {
    return (
      <div className={styles.empty}>
        <p>Loading deck…</p>
      </div>
    );
  }

  const myStars = deck.myRating ?? 0;
  const reviewBody = reviewDraft ?? "";
  const isSubmitting = rateStatus.isLoading || deleteStatus.isLoading;
  const average = deck.averageRating ?? 0;
  const ratingCount = deck.ratingCount ?? 0;
  const distribution = ratings?.starDistribution ?? [0, 0, 0, 0, 0];
  const items = ratings?.items ?? [];
  const hasMore = ratings?.hasMore ?? false;

  const submitStars = (next: number) => {
    void rateDeck({
      id: deckId,
      rateDeckRequest: { stars: next, review: reviewBody || undefined },
    });
  };

  const submitReview = () => {
    if (myStars <= 0) return;
    void rateDeck({
      id: deckId,
      rateDeckRequest: { stars: myStars, review: reviewBody || undefined },
    });
  };

  const clearMyRating = () => {
    void deleteMyRating({ id: deckId });
    setReviewDraft("");
  };

  const histogramMax =
    distribution.reduce((max, n) => Math.max(max, n), 0) || 1;

  return (
    <div className={styles.panel}>
      <section className={styles.summary}>
        <div className={styles.summaryAverage}>
          <span className={styles.averageNumber}>
            {ratingCount > 0 ? average.toFixed(1) : "—"}
          </span>
          <StarRating value={average} mode='display' size='md' />
          <span className={styles.summaryCount}>
            {ratingCount === 0
              ? "No ratings yet"
              : `${String(ratingCount)} rating${ratingCount === 1 ? "" : "s"}`}
          </span>
        </div>

        <ul className={styles.histogram} aria-label='Rating distribution'>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star - 1] ?? 0;
            const pct = (count / histogramMax) * 100;
            return (
              <li key={star} className={styles.histogramRow}>
                <span className={styles.histogramLabel}>{star}</span>
                <span
                  className={styles.histogramTrack}
                  role='img'
                  aria-label={`${String(count)} ${
                    count === 1 ? "rating" : "ratings"
                  } at ${String(star)} stars`}>
                  <span
                    className={styles.histogramFill}
                    style={{ width: `${String(pct)}%` }}
                  />
                </span>
                <span className={styles.histogramCount}>{count}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {isRegistered && (
        <section className={styles.myRating}>
          <h4 className={styles.heading}>Your rating</h4>
          <StarRating
            value={myStars}
            mode='input'
            size='lg'
            onChange={submitStars}
            onClear={clearMyRating}
          />
          {myStars > 0 && (
            <>
              <textarea
                className={styles.reviewInput}
                placeholder='Add a written review (optional)'
                value={reviewDraft ?? ""}
                onChange={(e) => {
                  setReviewDraft(e.target.value);
                }}
                rows={3}
                maxLength={2000}
                disabled={isSubmitting}
              />
              <div className={styles.myRatingActions}>
                <Btn
                  size='sm'
                  shape='pill'
                  onClick={submitReview}
                  disabled={isSubmitting}>
                  Save review
                </Btn>
              </div>
            </>
          )}
        </section>
      )}

      <section className={styles.reviews}>
        <h4 className={styles.heading}>Reviews</h4>
        {items.length === 0 && !isFetching ? (
          <p className={styles.empty}>No reviews yet.</p>
        ) : (
          <ul className={styles.reviewList}>
            {items.map((rating) => (
              <ReviewListItem
                key={rating.id}
                rating={rating}
                isMine={myRating?.id != null && rating.id === myRating.id}
              />
            ))}
          </ul>
        )}
        {(page > 0 || hasMore) && (
          <div className={styles.pager}>
            <Pagination
              page={page}
              hasMore={hasMore}
              disabled={isFetching}
              ariaLabel='Reviews pagination'
              onPageChange={setPage}
            />
          </div>
        )}
      </section>
    </div>
  );
};

interface ReviewListItemProps {
  rating: DeckRatingResponse;
  isMine?: boolean;
}

const ReviewListItem = ({ rating, isMine }: ReviewListItemProps) => (
  <li className={styles.reviewItem}>
    <div className={styles.reviewHeader}>
      {rating.user?.pictureUrl != null && rating.user.pictureUrl !== "" && (
        <img
          src={resolveAvatarSrc(rating.user.pictureUrl)}
          alt=''
          className={styles.reviewAvatar}
        />
      )}
      <span className={styles.reviewAuthor}>
        {rating.user?.name ?? "Anonymous"}
        {isMine === true && <span className={styles.mineBadge}>You</span>}
      </span>
      <StarRating value={rating.stars ?? 0} mode='display' size='sm' />
    </div>
    {rating.review != null && rating.review !== "" && (
      <p className={styles.reviewBody}>{rating.review}</p>
    )}
  </li>
);

export { DeckReviewsPanel };
