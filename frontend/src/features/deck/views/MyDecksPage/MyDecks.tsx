// My Decks dashboard body: header (title block, search, create action),
// publish-status tabs with counts, and the deck grid with the "New Deck" tile.
// All data + filter state lives in useMyDecksView.
import styles from "./MyDecksPage.module.css";
import { CreateDeckBtn } from "./CreateDeckBtn";
import { DeckCardWithMenu } from "./DeckCardWithMenu";
import { NewDeckCard } from "./NewDeckCard";
import {
  useMyDecksView,
  STATUS_FILTERS,
  type StatusFilter,
} from "./useMyDecksView";

import { DeckResponse } from "@deck/store/deckApi.gen";
import { ErrorPage } from "@/pages/ErrorPage/ErrorPage";
import { extractApiError } from "@utils/utils";
import { formatRelativeTime } from "@utils/relativeTime";
import { Input } from "@components/Forms/Input/Input/Input";
import { EmptyState } from "@ui/EmptyState/EmptyState";
import { Loader } from "@ui/Loader/Loader";
import { Tabs } from "@ui/Tabs/Tabs";

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  published: "Published",
  drafts: "Drafts",
  archived: "Archived",
};

const DeckGrid = ({
  decks,
  isSearching,
}: {
  decks: DeckResponse[];
  isSearching: boolean;
}) => {
  if (decks.length === 0 && isSearching) {
    return (
      <EmptyState
        title='No decks match your search'
        message='Try a different name, description, or tag.'
      />
    );
  }
  return (
    <div className={styles.grid}>
      {decks.map((deck) => (
        <DeckCardWithMenu key={deck.id} deck={deck} />
      ))}
      <NewDeckCard />
    </div>
  );
};

const MyDecks = () => {
  const {
    decksByFilter,
    countsByFilter,
    deckCount,
    lastEditedAt,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    isLoading,
    error,
  } = useMyDecksView();

  if (error != null) {
    const { statusCode, title, message } = extractApiError(error);
    return (
      <ErrorPage statusCode={statusCode} title={title} message={message} />
    );
  }

  if (isLoading) {
    return <Loader />;
  }

  const subtitle =
    deckCount === 0
      ? "No decks yet — create your first one"
      : `${deckCount} ${deckCount === 1 ? "deck" : "decks"}` +
        (lastEditedAt != null
          ? ` · last edited ${formatRelativeTime(lastEditedAt)}`
          : "");

  const isSearching = search.trim() !== "";

  return (
    <div className={styles.myDecks}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>My Decks</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <Input
          type='search'
          ariaLabel='Search decks'
          placeholder='Search decks…'
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          withPadding={false}
          className={styles.search}
        />
        <CreateDeckBtn />
      </header>

      <Tabs
        ariaLabel='Filter decks by publish status'
        value={statusFilter}
        onChange={(id) => {
          setStatusFilter(id as StatusFilter);
        }}
        items={STATUS_FILTERS.map((filter) => ({
          id: filter,
          label: (
            <>
              {FILTER_LABELS[filter]}
              <span className={styles.tabCount}>{countsByFilter[filter]}</span>
            </>
          ),
          panel: (
            <DeckGrid decks={decksByFilter[filter]} isSearching={isSearching} />
          ),
        }))}
      />
    </div>
  );
};

export { MyDecks };
