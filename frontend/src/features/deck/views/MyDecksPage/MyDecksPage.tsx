// Lists user-owned content decks and all system decks, with create/edit/delete actions.

import styles from "./MyDecksPage.module.css";
import { MyDecks } from "./MyDecks";
import { CreateDeckBtn } from "./CreateDeckBtn";

/**
 * Page level component to present decks accessible to the user
 *
 * Page components assemble components, they do not call any logic
 *
 * gate by _authenticated, only available to registered users
 *
 * **/
const MyDecksPage = () => {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Decks</h1>
        <CreateDeckBtn />
      </div>

      <section className={styles.section}>
        <MyDecks />
      </section>
    </div>
  );
};

export { MyDecksPage };
