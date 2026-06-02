// Lists user-owned content decks and all system decks, with create/edit/delete actions.
import { Link } from "@tanstack/react-router";
import type { DeckResponse } from "../../store/AmbiApi";
import { Btn } from "@/components/Common/Buttons/Btn";
import { DeckActionButton } from "@/components/Common/Buttons/DeckActionButton/DeckActionButton";
import { DeckCard } from "@/components/Common/Cards/DeckCard";
import {
  DropdownMenu,
  DropdownMenuItem,
} from "@/components/Menus/DropdownMenu";
import { useDeck } from "@/hooks/useDeck";

const DeckCardWithMenu = ({ deck }: { deck: DeckResponse }) => {
  const {
    openDeckInEditor,
    openDeleteDeckModal,
    handlePresent,
    handleAddToCollection,
  } = useDeck(deck.id);

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
                      search={{ questionId: undefined }}
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
      <DropdownMenuItem onClick={handlePresent}>
        Use as presentation
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleAddToCollection}>
        Add to collection…
      </DropdownMenuItem>
    </DropdownMenu>
  );
};

export { DeckCardWithMenu };
