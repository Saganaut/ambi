import styles from "./MyDecks.module.css";
import { DeckCardWithMenu } from "./DeckCardWithMenu";
import { useListMyDecksQuery } from "@store/AmbiApi";
import { ErrorPage } from "@/pages/ErrorPage/ErrorPage";
import { extractApiError } from "@utils/utils";
import { Loader } from "@/shared/components/UIElements/Loader/Loader";

const MyDecks = () => {
  const {
    data: myDecks,
    isLoading: myDecksIsLoading,
    error: myDecksError,
  } = useListMyDecksQuery();

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
