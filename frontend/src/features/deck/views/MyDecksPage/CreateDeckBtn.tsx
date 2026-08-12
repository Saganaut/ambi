// Header "New Deck" button (Ambi DS brand button with plus icon): creates an
// empty deck and navigates straight to its editor.
import PlusIcon from "@assets/icons/action/plus.svg?react";

import styles from "./MyDecksPage.module.css";
import { Btn } from "@saganaut/ambi-ui";
import { useCreateDeck } from "../../hooks/useCreateDeck";

const CreateDeckBtn = () => {
  const { createDeckAndGoToEditor, isCreating } = useCreateDeck();

  return (
    <Btn
      variant='brand'
      icon={<PlusIcon className={styles.btnIcon} aria-hidden='true' />}
      isLoading={isCreating}
      onClick={createDeckAndGoToEditor}>
      New Deck
    </Btn>
  );
};

export { CreateDeckBtn };
