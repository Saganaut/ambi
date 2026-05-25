/**
 * Content deck selection grid for the Create Game flow.
 * Shows system decks and the user's own decks (when logged in).
 * A "Create new deck" link lets registered users build a custom deck and return here.
 */
import { Link } from "@tanstack/react-router";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import {
  useListDecksQuery,
  useListMyDecksQuery,
} from "../../../store/BrainFlexApi";
import type { DeckResponse } from "../../../store/BrainFlexApi";
import { SelectableTile } from "../../Common/SelectableTile/SelectableTile";
import styles from "./ContentDeckPicker.module.css";

interface ContentDeckPickerProps {
  selectedDeckId: string | null;
  onSelect: (deckId: string) => void;
}

const DeckButton = ({
  deck,
  selected,
  onSelect,
}: {
  deck: DeckResponse;
  selected: boolean;
  onSelect: (id: string) => void;
}) => (
  <SelectableTile
    size='sm'
    title={deck.name ?? ""}
    meta={`${(deck.elementCount ?? 0).toString()} elements${
      deck.tags && deck.tags.length > 0 ? ` · ${deck.tags[0]}` : ""
    }`}
    description={deck.description}
    selected={selected}
    onClick={() => {
      if (deck.id) onSelect(deck.id);
    }}
  />
);

const ContentDeckPicker = ({
  selectedDeckId,
  onSelect,
}: ContentDeckPickerProps) => {
  const userState = useCurrentUser();
  const isRegistered = userState.state === "registered";

  const {
    data: publicDecks = [],
    isLoading: loadingPublic,
    isError,
  } = useListDecksQuery();
  const { data: myDecks = [], isLoading: loadingMine } = useListMyDecksQuery(
    undefined,
    { skip: !isRegistered },
  );

  const isLoading = loadingPublic || (isRegistered && loadingMine);
  const systemDecks = publicDecks.filter((p) => p.isSystem);

  if (isLoading) return <p className={styles.message}>Loading decks…</p>;
  if (isError)
    return <p className={styles.message}>Failed to load content decks.</p>;

  return (
    <div>
      {isRegistered && myDecks.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Your Decks</span>
          <div className={styles.grid}>
            {myDecks.map((deck) => (
              <DeckButton
                key={deck.id}
                deck={deck}
                selected={selectedDeckId === deck.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <span className={styles.sectionLabel}>Templates</span>
        {systemDecks.length > 0 ? (
          <div className={styles.grid}>
            {systemDecks.map((deck) => (
              <DeckButton
                key={deck.id}
                deck={deck}
                selected={selectedDeckId === deck.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        ) : (
          <p className={styles.message}>No templates available.</p>
        )}
      </div>

      {isRegistered && (
        <Link to='/decks' className={styles.createLink} viewTransition>
          + Create your own deck
        </Link>
      )}
    </div>
  );
};

export { ContentDeckPicker };
