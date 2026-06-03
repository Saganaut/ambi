import { Btn } from "@common/Buttons/Btn";
import { useCreateDeck } from "../../hooks/useCreateDeck";

const CreateDeckBtn = () => {
  const { createDeckAndGoToEditor } = useCreateDeck();

  return <Btn onClick={createDeckAndGoToEditor}>New Deck</Btn>;
};

export { CreateDeckBtn };
