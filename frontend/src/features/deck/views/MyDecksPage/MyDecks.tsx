import styles from "./MyDecks.module.css";
import { DeckCardWithMenu } from "./DeckCardWithMenu";
import { useListMyDecksQuery } from "@deck/store/deckApi.gen";
import { ErrorPage } from "@/pages/ErrorPage/ErrorPage";
import { extractApiError } from "@utils/utils";
import { IMAGE_QUERY_REFRESH } from "@/shared/store/imageRefreshPolicy.ts";
import { Loader } from "@/shared/components/UIElements/Loader/Loader";

const MyDecks = () => {
  // Deck cards render presigned cover-image URLs; keep them fresh so a long-open
  // dashboard never shows an expired URL. See imageRefreshPolicy.
  const {
    data: myDecks,
    isLoading: myDecksIsLoading,
    error: myDecksError,
  } = useListMyDecksQuery(undefined, IMAGE_QUERY_REFRESH);

  if (myDecksError) {
    const { statusCode, title, message } = extractApiError(myDecksError);
    return (
      <ErrorPage statusCode={statusCode} title={title} message={message} />
    );
  }

  if (myDecksIsLoading || myDecks === undefined) {
    return <Loader />;
  }

  return (
    <div className={styles.myDecks}>
      <div className={styles.grid}>
        {myDecks.map((deck) => (
          <DeckCardWithMenu key={deck.id} deck={deck} />
        ))}
      </div>
    </div>
  );
};

export { MyDecks };
