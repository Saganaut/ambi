// Lists user-owned content decks and all system decks, with create/edit/delete actions.
import { Link, useNavigate } from "@tanstack/react-router";
import type { DeckResponse } from "../../store/AmbiApi";
import { Btn } from "@/components/Common/Buttons/Btn";
import { DeckActionButton } from "@/components/Common/Buttons/DeckActionButton/DeckActionButton";
import { DeckCard } from "@/components/Common/Cards/DeckCard";
import {
  DropdownMenu,
  DropdownMenuItem,
} from "@/components/Menus/DropdownMenu";
import { useConfirm } from "@/components/Common/ConfirmDialog/useConfirm";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useDeleteDeckMutation } from "@/store/AmbiApi";

const DeckCardWithMenu = ({ deck }: { deck: DeckResponse }) => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const deckId = deck.id;
  // Delete via the mutation directly (not useDeck) so a list of cards doesn't
  // each fire a getDeck query; cache reconciliation lives in enhancements/deck.
  const [deleteDeck] = useDeleteDeckMutation();
  const { present } = useLiveSession();

  const goToEdit = () => {
    void navigate({
      to: "/decks/$deckId/edit",
      params: { deckId },
      search: { questionId: undefined },
    });
  };

  const handleAddToCollection = () => {
    console.log("adding to collection not implemented yet");
  };

  const handlePresent = () => {
    // Placeholder until the live-session flow exists; logs "not yet implemented".
    present(deckId);
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete deck",
      message: "Delete this deck and all its questions?",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteDeck({ id: deckId }).unwrap();
    } catch (e) {
      console.error("Failed to delete deck", e);
    }
  };

  const editable = true;
  return (
    <DropdownMenu
      position='top-left'
      anchorToCursor
      trigger={(toggle) => (
        <DeckCard
          deck={deck}
          variant='full'
          onClick={goToEdit}
          onContextMenu={(e) => {
            e.preventDefault();
            toggle(e);
          }}
          actions={
            deck.id ? (
              <>
                <DeckActionButton deckId={deck.id} size='sm' />
                {editable && (
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
                        void handleDelete();
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
