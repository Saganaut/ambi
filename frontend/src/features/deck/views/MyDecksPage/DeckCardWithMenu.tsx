// Lists user-owned content decks and all system decks, with create/edit/delete actions.
import { DeckResponse } from "@deck/store/deckApi.gen";
import { Btn } from "@ui/Buttons/Btn";
import { DeckActionButton } from "@deck/components/DeckActionButton/DeckActionButton";
import { DeckCard } from "@deck/components/DeckCard/DeckCard";
import { DropdownMenu, DropdownMenuItem } from "@components/Menus/DropdownMenu";

import { Link } from "@tanstack/react-router";
import { useDeckActions } from "../../hooks/useDeckActions";

const DeckCardWithMenu = ({ deck }: { deck: DeckResponse }) => {
  const {
    openDeckInEditor,
    openDeleteDeckModal,
    present,
    addToCollection,
  } = useDeckActions(deck.id);

  return (
    <DropdownMenu
      position='top-left'
      anchorToCursor
      trigger={(toggle) => (
        <DeckCard
          deck={deck}
          variant='full'
          onClick={void openDeckInEditor}
          onContextMenu={(e) => {
            e.preventDefault();
            toggle(e);
          }}
          actions={
            deck.id ? (
              <>
                <DeckActionButton deckId={deck.id} size='sm' />
                {deck.permissions.canEdit && (
                  <>
                    <Link
                      to='/decks/$deckId/edit'
                      params={{ deckId: deck.id }}
                      search={{ slideId: undefined }}
                      viewTransition>
                      <Btn size='sm'>Edit</Btn>
                    </Link>
                    <Btn
                      size='sm'
                      variant='error'
                      onClick={() => {
                        void openDeleteDeckModal();
                      }}>
                      Delete
                    </Btn>
                  </>
                )}
              </>
            ) : null
          }
        />
      )}>
      <DropdownMenuItem onClick={present}>
        Use as presentation
      </DropdownMenuItem>
      <DropdownMenuItem onClick={addToCollection}>
        Add to collection…
      </DropdownMenuItem>
    </DropdownMenu>
  );
};

export { DeckCardWithMenu };
