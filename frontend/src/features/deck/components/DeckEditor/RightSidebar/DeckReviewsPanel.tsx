// Reviews panel for the deck-editor right sidebar.
// TODO: Wire rating APIs once they are available in AmbiApi:
//   - useListRatingsQuery({ id: deckId, page, size }) → paginated reviews
//   - useGetMyRatingQuery({ id: deckId }) → caller's current rating
//   - useRateDeckMutation() → submit or update rating
//   - useDeleteMyRatingMutation() → clear own rating
//   - DeckRatingResponse type (id, stars, review, user, createdAt)
// The rating histogram and average can be shown from deck.stats.
import { getRouteApi } from "@tanstack/react-router";
import { useGetDeckQuery } from "@deck/store/deckApi.gen";
import styles from "./DeckReviewsPanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const useDeckReviewsPanel = () => {
  const { deckId } = routeApi.useParams();
  const { data: deck } = useGetDeckQuery({ id: deckId });
  // TODO: const { data: ratings } = useListRatingsQuery({ id: deckId, page: 0, size: 10 });
  // TODO: const myRatingQuery = useGetMyRatingQuery({ id: deckId });
  // TODO: const [rateDeck] = useRateDeckMutation();
  // TODO: const [deleteMyRating] = useDeleteMyRatingMutation();
  return {
    average: deck?.stats?.ratingAverage ?? 0,
    ratingCount: deck?.stats?.ratingCount ?? 0,
  };
};

const DeckReviewsPanel = () => {
  const { average, ratingCount } = useDeckReviewsPanel();

  return (
    <div className={styles.panel}>
      <section className={styles.summary}>
        <div className={styles.summaryAverage}>
          <span className={styles.averageNumber}>
            {ratingCount > 0 ? average.toFixed(1) : "—"}
          </span>
          <span className={styles.summaryCount}>
            {ratingCount === 0
              ? "No ratings yet"
              : `${String(ratingCount)} rating${ratingCount === 1 ? "" : "s"}`}
          </span>
        </div>
      </section>

      <section className={styles.reviews}>
        {/* TODO: Wire paginated review list + star rating input once rating APIs
            are available (useListRatingsQuery, useRateDeckMutation, etc.). */}
        <p className={styles.empty}>
          Full reviews panel coming soon. Rating APIs are not yet available.
        </p>
      </section>
    </div>
  );
};

export { DeckReviewsPanel };
