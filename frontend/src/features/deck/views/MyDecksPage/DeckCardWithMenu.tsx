// Deck card wired with its per-deck actions (Ambi DS "Deck Card" actions row:
// present, edit, delete) and the right-click context menu.
// Heroicons here are the sanctioned placeholders (see icons-rules.md §7): the
// designer-shipped eye/edit/delete SVGs hard-code colors or are fill-based,
// which the stroke-oriented Btn/IconBtn CSS can't render.
import { EyeIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

import styles from "./MyDecksPage.module.css";
import { DeckResponse } from "@deck/store/deckApi.gen";
import { Btn } from "@ui/Buttons/Btn";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { DeckCard } from "@deck/components/DeckCard/DeckCard";
import { DropdownMenu, DropdownMenuItem } from "@components/Menus/DropdownMenu";

import { Link } from "@tanstack/react-router";
import { useDeckActions } from "../../hooks/useDeckActions";
import { usePrefetchDeckEditor } from "../../hooks/usePrefetchDeckEditor";

const DeckCardWithMenu = ({ deck }: { deck: DeckResponse }) => {
  const {
    openDeckInEditor,
    openDeleteDeckModal,
    present,
    addToCollection,
  } = useDeckActions(deck.id);
  const prefetchEditor = usePrefetchDeckEditor(deck.id);

  return (
    <DropdownMenu
      position='top-left'
      anchorToCursor
      trigger={(toggle) => (
        <DeckCard
          deck={deck}
          variant='full'
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
                <IconBtn
                  size='sm'
                  variant='secondary'
                  aria-label='Present deck'
                  icon={<EyeIcon aria-hidden='true' />}
                  onClick={(e) => {
                    e.stopPropagation();
                    present();
                  }}
                />
                <span className={styles.actionsSpacer} />
                {deck.permissions.canEdit && (
                  <>
                    <Link
                      to='/decks/$deckId/edit'
                      params={{ deckId: deck.id }}
                      search={{ slideId: undefined }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      viewTransition>
                      <Btn
                        size='sm'
                        variant='secondary'
                        icon={
                          <PencilIcon
                            className={styles.btnIcon}
                            aria-hidden='true'
                          />
                        }>
                        Edit
                      </Btn>
                    </Link>
                    <IconBtn
                      size='sm'
                      variant='error'
                      aria-label='Delete deck'
                      icon={<TrashIcon aria-hidden='true' />}
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
