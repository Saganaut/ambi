// Lists user-owned content decks with search, publish-status tabs, and
// create/edit/delete actions.

import { MyDecks } from "./MyDecks";
import styles from "./MyDecksPage.module.css";

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
      <MyDecks />
    </div>
  );
};

export { MyDecksPage };
