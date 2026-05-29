// Curated discovery surface for PUBLIC + PUBLISHED decks. Now backed by the
// dedicated /api/decks/explore endpoint so filtering + sorting happen on the
// server (and the response carries denormalized rating / playCount fields
// the deck card surfaces).
//
// Layout: filter sidebar on the left (subject chips, language, difficulty)
// + sort dropdown + paginated deck grid. "Load more" pulls the next page;
// changing any filter resets to page 0.
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  useExploreDecksQuery,
  useListTagsQuery,
  type DeckResponse,
  type ExploreDecksApiArg,
} from "@/store/AmbiApi";
import { DeckCard } from "@/components/Common/Cards/DeckCard";
import { Dropdown } from "@/components/Common/Input/Dropdown/Dropdown";
import { Pagination } from "@/components/Common/Pagination/Pagination";
import styles from "./ExplorePage.module.css";

type SortKey = "trending" | "new" | "top-rated" | "most-played";
type DifficultyKey = NonNullable<DeckResponse["difficulty"]>;
type LanguageKey = "en" | "es" | "fr" | "de";

const PAGE_SIZE = 12;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "new", label: "New" },
  { value: "top-rated", label: "Top rated" },
  { value: "most-played", label: "Most played" },
];

const LANGUAGE_OPTIONS: { value: LanguageKey | "all"; label: string }[] = [
  { value: "all", label: "Any language" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

const DIFFICULTY_OPTIONS: { value: DifficultyKey | "all"; label: string }[] = [
  { value: "all", label: "Any difficulty" },
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

const ExplorePage = () => {
  const navigate = useNavigate();
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [language, setLanguage] = useState<LanguageKey | "all">("all");
  const [difficulty, setDifficulty] = useState<DifficultyKey | "all">("all");
  const [sort, setSort] = useState<SortKey>("trending");
  const [page, setPage] = useState(0);

  // Every filter setter rewinds to page 0 — there's no notion of "load more"
  // here, just Previous / Next paging, so we don't need a client accumulator.
  const changeFilter = (apply: () => void) => {
    apply();
    setPage(0);
  };

  const { data: curatedTags = [] } = useListTagsQuery({ curated: true });

  const exploreArgs: ExploreDecksApiArg = {
    tagId: activeTagId ?? undefined,
    language: language === "all" ? undefined : language,
    difficulty: difficulty === "all" ? undefined : difficulty,
    sort,
    page,
    size: PAGE_SIZE,
  };
  const { data: response, isFetching } = useExploreDecksQuery(exploreArgs);

  const items = response?.items ?? [];
  const total = response?.totalElements ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={styles.explore}>
      <header className={styles.header}>
        <h1 className={styles.title}>Explore</h1>
        <p className={styles.subtitle}>
          Browse published decks by subject. Filter on the left, sort on the
          right.
        </p>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label='Deck filters'>
          <section className={styles.filterSection}>
            <h2 className={styles.filterHeading}>Subject</h2>
            <div
              className={styles.subjectChips}
              role='radiogroup'
              aria-label='Subject'>
              <button
                type='button'
                role='radio'
                aria-checked={activeTagId === null}
                className={[
                  styles.tagChip,
                  activeTagId === null ? styles.tagChipActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  changeFilter(() => {
                    setActiveTagId(null);
                  });
                }}>
                All
              </button>
              {curatedTags.map((tag) => (
                <button
                  key={tag.id}
                  type='button'
                  role='radio'
                  aria-checked={activeTagId === tag.id}
                  className={[
                    styles.tagChip,
                    activeTagId === tag.id ? styles.tagChipActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    changeFilter(() => {
                      setActiveTagId(tag.id ?? null);
                    });
                  }}>
                  <span>{tag.displayName}</span>
                  <span className={styles.tagCount}>{tag.deckCount ?? 0}</span>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.filterSection}>
            <Dropdown
              label='Language'
              options={LANGUAGE_OPTIONS}
              value={[language]}
              onChange={(values) => {
                changeFilter(() => {
                  setLanguage(values[0] as LanguageKey | "all");
                });
              }}
            />
          </section>

          <section className={styles.filterSection}>
            <Dropdown
              label='Difficulty'
              options={DIFFICULTY_OPTIONS}
              value={[difficulty]}
              onChange={(values) => {
                changeFilter(() => {
                  setDifficulty(values[0] as DifficultyKey | "all");
                });
              }}
            />
          </section>
        </aside>

        <section className={styles.main}>
          <div className={styles.toolbar}>
            <span className={styles.resultsCount}>
              {isFetching ? "Loading…" : `${String(total)} decks`}
            </span>
            <Dropdown
              label='Sort by'
              labelPosition='labelInFront'
              options={SORT_OPTIONS}
              value={[sort]}
              onChange={(values) => {
                changeFilter(() => {
                  setSort(values[0] as SortKey);
                });
              }}
            />
          </div>

          {items.length === 0 && !isFetching ? (
            <p className={styles.empty}>No decks match these filters yet.</p>
          ) : (
            <ul className={styles.grid}>
              {items.map((deck) => (
                <li key={deck.id} className={styles.gridItem}>
                  <DeckCard
                    deck={deck}
                    variant='discovery'
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
                ariaLabel='Decks pagination'
                onPageChange={setPage}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export { ExplorePage };
