import { useListMyDecksQuery } from "@/store/AmbiApi";
import styles from "./MyDecks.module.css";
import { DeckCardWithMenu } from "./DeckCardWithMenu";
/**  Container Component for My Decks.
 *   Calls useListMyDecksQuery to populate container
 *
 *  **/

const MyDecks = () => {
  const {
    data: myDecks,
    isLoading: myDecksIsLoading,
    error: myDecksError,
  } = useListMyDecksQuery();

  return (
    <div className={styles.myDecks}>
      {myDecksIsLoading || myDecks === undefined ? (
        <div>Loading... </div>
      ) : myDecksError ? (
        <div>Error...</div>
      ) : (
        <div className={styles.grid}>
          {myDecks.map((deck) => (
            <DeckCardWithMenu key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </div>
  );
};

export { MyDecks };
