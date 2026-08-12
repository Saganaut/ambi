// Dashed "New Deck" tile rendered at the end of the deck grid — same
// create-and-open flow as the header button, offered where the eye already is.
import PlusIcon from "@assets/icons/action/plus.svg?react";

import styles from "./MyDecksPage.module.css";
import { useCreateDeck } from "../../hooks/useCreateDeck";

const NewDeckCard = () => {
  const { createDeckAndGoToEditor, isCreating } = useCreateDeck();

  return (
    <button
      type='button'
      className={styles.newDeckCard}
      disabled={isCreating}
      aria-busy={isCreating}
      onClick={createDeckAndGoToEditor}>
      <span className={styles.newDeckPlus} aria-hidden='true'>
        <PlusIcon />
      </span>
      <span className={styles.newDeckTitle}>New Deck</span>
      <span className={styles.newDeckHint}>Start from a blank deck</span>
    </button>
  );
};

export { NewDeckCard };
