// Header "New Deck" button (Ambi DS brand button with plus icon): creates an
// empty deck and navigates straight to its editor.
import { PlusIcon } from "@heroicons/react/24/outline";

import styles from "./MyDecksPage.module.css";
import { Btn } from "@ui/Buttons/Btn";
import { useCreateDeck } from "../../hooks/useCreateDeck";

const CreateDeckBtn = () => {
  const { createDeckAndGoToEditor } = useCreateDeck();

  return (
    <Btn
      variant='brand'
      icon={<PlusIcon className={styles.btnIcon} aria-hidden='true' />}
      onClick={createDeckAndGoToEditor}>
      New Deck
    </Btn>
  );
};

export { CreateDeckBtn };
