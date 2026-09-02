// Deck card wired with its per-deck actions (Ambi DS "Deck Card" actions row:
// present, edit, delete) and the right-click context menu.
import TrashIcon from "@assets/icons/action/delete.svg?react";
import PencilIcon from "@assets/icons/action/edit.svg?react";
import EyeIcon from "@assets/icons/action/eye.svg?react";

import { DeckCard } from "@deck/components/DeckCard/DeckCard";
import { DeckResponse } from "@deck/store/deckApi.gen";
import { Btn, DropdownMenu } from "@saganaut/ambi-ui";
import styles from "./MyDecksPage.module.css";

import { Link } from "@tanstack/react-router";
import { useDeckActions } from "../../hooks/useDeckActions";
import { usePrefetchDeckEditor } from "../../hooks/usePrefetchDeckEditor";

const DeckCardWithMenu = ({ deck }: { deck: DeckResponse }) => {
  const { openDeckInEditor, openDeleteDeckModal, present, addToCollection } = useDeckActions(
    deck.id,
  );
  const prefetchEditor = usePrefetchDeckEditor(deck.id);

  return (
    <DropdownMenu
      position="top-left"
      anchorToCursor
      trigger={(toggle) => (
        <DeckCard
          deck={deck}
          variant="full"
          onClick={openDeckInEditor}
          onMouseEnter={prefetchEditor.onMouseEnter}
          onFocus={prefetchEditor.onFocus}
          onContextMenu={(e) => {
            e.preventDefault();
            toggle(e);
          }}
          actions={
            deck.id ? (
              <>
                <Btn
                  size="sm"
                  variant="secondary"
                  aria-label="Present deck"
                  icon={<EyeIcon aria-hidden="true" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    present();
                  }}
                />
                <span className={styles.actionsSpacer} />
                {deck.permissions.canEdit && (
                  <>
                    <Link
                      to="/decks/$deckId/edit"
                      params={{ deckId: deck.id }}
                      search={{ slideId: undefined }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      viewTransition
                    >
                      <Btn
                        size="sm"
                        variant="secondary"
                        icon={<PencilIcon className={styles.btnIcon} aria-hidden="true" />}
                      >
                        Edit
                      </Btn>
                    </Link>
                    <Btn
                      size="sm"
                      variant="error"
                      aria-label="Delete deck"
                      icon={<TrashIcon aria-hidden="true" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        void openDeleteDeckModal();
                      }}
                    />
                  </>
                )}
              </>
            ) : null
          }
        />
      )}
    >
      <DropdownMenu.Item onClick={present}>Use as presentation</DropdownMenu.Item>
      <DropdownMenu.Item onClick={addToCollection}>Add to collection…</DropdownMenu.Item>
    </DropdownMenu>
  );
};

export { DeckCardWithMenu };
