// /my-favorites — paginated grid of decks the caller has starred. Reuses the
// same card visual language as MyDecks; the heart on each tile doubles as the
// remove-from-favorites toggle thanks to the shared optimistic update wiring
// in apiEnhancements.ts.
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useListMyFavoritesQuery } from "@/store/BrainFlexApi";
import { DeckCard } from "@/components/Common/Cards/DeckCard";
import { Pagination } from "@/components/Common/Pagination/Pagination";
import styles from "./FavoritesPage.module.css";

const PAGE_SIZE = 24;

const FavoritesPage = () => {
  // Gated by /_authenticated — caller is always a registered user here.
  const navigate = useNavigate();
  const [page, setPage] = useState(0);

  const { data, isFetching } = useListMyFavoritesQuery(
    { page, size: PAGE_SIZE },
    { refetchOnMountOrArgChange: true },
  );

  const items = data?.items ?? [];
  const total = data?.totalElements ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Favorites</h1>
        <span className={styles.subtitle}>
          {isFetching ? "Loading…" : `${String(total)} decks`}
        </span>
      </header>

      {items.length === 0 && !isFetching ? (
        <p className={styles.empty}>
          You haven&apos;t favorited any decks yet. Tap the heart on any deck
          card to add it here.
        </p>
      ) : (
        <ul className={styles.grid}>
          {items.map((deck) => (
            <li key={deck.id} className={styles.gridItem}>
              <DeckCard
                deck={{ ...deck, isFavorited: deck.isFavorited ?? true }}
                variant='compact'
                onClick={() => {
                  void navigate({
                    to: "/decks/$deckId/edit",
                    params: { deckId: deck.id ?? "" },
                    search: { questionId: undefined },
                  });
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <div className={styles.pager}>
          <Pagination
            page={page}
            pageCount={pageCount}
            disabled={isFetching}
            ariaLabel='Favorites pagination'
            onPageChange={setPage}
          />
        </div>
      )}
    </main>
  );
};

export { FavoritesPage };
