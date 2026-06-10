// Reviews panel for the deck-editor right sidebar. Scoped to the whole deck (not
// a slide): a rating summary with a star-distribution histogram on top, the
// caller's own rating editor below it (hidden for the deck's own editors — you
// cannot review your own work), then the paginated list of written reviews.
//
// The headline (average / count / distribution) comes from the dedicated review
// summary endpoint rather than `deck.stats`, so it stays exact and refreshes in
// step with the list after a write. There are no RTK Query tags in this app, so
// after rating / clearing we simply refetch the three review queries.
import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { useGetDeckQuery } from "@deck/store/deckApi.gen";
import {
  useDeleteMyReviewMutation,
  useGetDeckReviewSummaryQuery,
  useGetMyReviewQuery,
  useListDeckReviewsQuery,
  useRateDeckMutation,
} from "@deck/store/reviewApi.gen";
import { sharedValidation } from "@/shared/store/sharedValidationConstants";
import { Avatar } from "@ui/Avatar/Avatar";
import { Btn } from "@ui/Buttons/Btn";
import { Pagination } from "@ui/Pagination/Pagination";
import { StarRating } from "@ui/StarRating/StarRating";
import { resolveProfileAvatarSrc } from "@utils/avatarUrl";
import styles from "./DeckReviewsPanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");
const PAGE_SIZE = 10;
const REVIEW_BODY_MAX = sharedValidation.RateDeckRequest.body.maxLength;

const useDeckReviewsPanel = () => {
  const { deckId } = routeApi.useParams();
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

const DeckReviewsPanel = () => {
  const {
    canReview,
    average,
    count,
    distribution,
    reviews,
    pageCount,
    page,
    setPage,
    isLoading,
    myReview,
    saving,
    clearing,
    submit,
    clear,
  } = useDeckReviewsPanel();

  return (
    <div className={styles.panel}>
      <section className={styles.summary}>
        <div className={styles.summaryAverage}>
          <span className={styles.averageNumber}>
            {count > 0 && average != null ? average.toFixed(1) : "—"}
          </span>
          <span className={styles.summaryCount}>
            {count === 0
              ? "No ratings yet"
              : `${String(count)} rating${count === 1 ? "" : "s"}`}
          </span>
        </div>
        {count > 0 && (
          <Histogram distribution={distribution} total={count} />
        )}
      </section>

      {canReview && (
        <MyRatingEditor
          key={myReview?.id ?? "new"}
          initialStars={myReview?.stars ?? null}
          initialBody={myReview?.body ?? ""}
          hasReview={myReview != null}
          saving={saving}
          clearing={clearing}
          onSave={submit}
          onClear={clear}
        />
      )}

      <section className={styles.reviews}>
        {isLoading ? (
          <p className={styles.empty}>Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className={styles.empty}>No written reviews yet.</p>
        ) : (
          <>
            <ul className={styles.reviewList}>
              {reviews.map((review) => (
                <li key={review.id} className={styles.reviewItem}>
                  <header className={styles.reviewHeader}>
                    <span className={styles.reviewAuthor}>
                      <Avatar
                        src={resolveProfileAvatarSrc(review.author.avatar)}
                        name={review.author.name}
                        size='xs'
                        className={styles.reviewAvatar}
                      />
                      {review.author.name}
                      {review.mine && <span className={styles.mineBadge}>You</span>}
                    </span>
                    <StarRating value={review.stars} mode='display' size='sm' />
                  </header>
                  {review.body != null && review.body !== "" && (
                    <p className={styles.reviewBody}>{review.body}</p>
                  )}
                </li>
              ))}
            </ul>
            {pageCount > 1 && (
              <div className={styles.pager}>
                <Pagination
                  page={page}
                  pageCount={pageCount}
                  onPageChange={setPage}
                  ariaLabel='Review pages'
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

interface HistogramProps {
  distribution: number[];
  total: number;
}

// Rows run 5★ down to 1★. `distribution` is indexed 0 = 1★ … 4 = 5★.
const Histogram = ({ distribution, total }: HistogramProps) => (
  <ul className={styles.histogram}>
    {[5, 4, 3, 2, 1].map((stars) => {
      const n = distribution[stars - 1] ?? 0;
      const pct = total > 0 ? (n / total) * 100 : 0;
      return (
        <li key={stars} className={styles.histogramRow}>
          <span className={styles.histogramLabel}>{stars}</span>
          <span className={styles.histogramTrack}>
            <span
              className={styles.histogramFill}
              style={{ width: `${String(pct)}%` }}
            />
          </span>
          <span className={styles.histogramCount}>{n}</span>
        </li>
      );
    })}
  </ul>
);

interface MyRatingEditorProps {
  initialStars: number | null;
  initialBody: string;
  hasReview: boolean;
  saving: boolean;
  clearing: boolean;
  onSave: (stars: number, body: string) => Promise<void> | void;
  onClear: () => Promise<void> | void;
}

const MyRatingEditor = ({
  initialStars,
  initialBody,
  hasReview,
  saving,
  clearing,
  onSave,
  onClear,
}: MyRatingEditorProps) => {
  // Seeded once per mount; the parent remounts this via `key` (the caller's
  // review id) whenever their stored review resolves, changes, or is cleared,
  // so these initializers re-run with the fresh values — no syncing effect.
  const [stars, setStars] = useState<number | null>(initialStars);
  const [body, setBody] = useState(initialBody);

  return (
    <section className={styles.myRating}>
      <p className={styles.heading}>Your rating</p>
      <StarRating
        value={stars}
        mode='input'
        size='lg'
        onChange={setStars}
        onClear={() => {
          setStars(null);
        }}
        label='Rate this deck'
      />
      <textarea
        className={styles.reviewInput}
        aria-label='Write a review'
        placeholder='Share what you thought (optional)…'
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
        }}
        rows={3}
        maxLength={REVIEW_BODY_MAX}
      />
      <div className={styles.myRatingActions}>
        {hasReview && (
          <Btn
            size='sm'
            shape='pill'
            variant='secondary'
            fill='ghost'
            disabled={clearing}
            onClick={() => {
              void onClear();
            }}>
            Remove
          </Btn>
        )}
        <Btn
          size='sm'
          shape='pill'
          disabled={saving || stars == null}
          onClick={() => {
            if (stars == null) return;
            void onSave(stars, body);
          }}>
          {hasReview ? "Update review" : "Save review"}
        </Btn>
      </div>
    </section>
  );
};

export { DeckReviewsPanel };
