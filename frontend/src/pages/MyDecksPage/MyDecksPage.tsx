// Lists user-owned content decks and all system decks, with create/edit/delete actions.
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Ambi,
  useListMyDecksQuery,
  useListDecksQuery,
  useDeleteDeckMutation,
  useCreateDeckMutation,
  useAddElementMutation,
} from "../../store/AmbiApi";
import type { DeckResponse, Slide } from "../../store/AmbiApi";
import { useAppDispatch } from "../../store/hooks";
import { Btn } from "@/components/Common/Buttons/Btn";
import { DeckActionButton } from "@/components/Common/Buttons/DeckActionButton/DeckActionButton";
import { DeckCard } from "@/components/Common/Cards/DeckCard";
import {
  DropdownMenu,
  DropdownMenuItem,
} from "@/components/Menus/DropdownMenu";
import { AddToCollectionModal } from "@/components/Collections/AddToCollectionModal";
import { useConfirm } from "@/components/Common/ConfirmDialog/useConfirm";
import { useModal } from "@/context/useModal";
import styles from "./MyDecksPage.module.css";

/**
 * Starter slide stamped into every new deck so the editor never opens onto an
 * empty rail. Same id is used for the optimistic cache seed AND the persisted
 * `addElement` call after the deck is created — that way the slide stays
 * selected and visible without a flicker between optimistic and confirmed state.
 */
// Primitive defaults must mirror useDeckEditor.buildNewElement — Jackson
// cannot deserialize null into the backend's primitive boolean/int fields.
const buildFirstSlide = (id: string): Slide => ({
  kind: "Slide",
  id,
  slideKind: "TITLE",
  body: "",
  resultsDisplayType: "DEFAULT",
  multipleSelectionsEnabled: false,
  selectionsPerParticipant: 1,
  showResultsAsPercentage: false,
  joinType: "INSTRUCTIONS_BAR",
  showJoinInformation: true,
  showQrCode: false,
  showResponses: "INSTANT",
  chrome: {
    title: "Untitled slide",
    scored: false,
    survey: false,
    displaySeconds: 0,
    mediaPosition: "NONE",
    tagIds: [],
    reactionsEnabled: true,
    version: 1,
  },
});

const buildOptimisticDeck = (
  id: string,
  name: string,
  firstSlide: Slide,
): DeckResponse => ({
  id,
  name,
  description: "",
  tags: [],
  isSystem: false,
  visibility: "PRIVATE",
  defaultSessionFormat: "GAME",
  elementCount: 1,
  elements: [firstSlide],
});

const DeckCardWithMenu = ({
  deck,
  editable,
  onDelete,
}: {
  deck: DeckResponse;
  editable: boolean;
  onDelete?: (id: string) => void;
}) => {
  const navigate = useNavigate();
  const { openModal, closeModal } = useModal();

  const handleAddToCollection = () => {
    if (deck.id == null) return;
    const deckId = deck.id;
    openModal({
      title: "Add to collection",
      content: <AddToCollectionModal deckId={deckId} onClose={closeModal} />,
    });
  };

  return (
    <DropdownMenu
      position='top-left'
      anchorToCursor
      trigger={(toggle) => (
        <DeckCard
          deck={deck}
          variant='full'
          onClick={() => {
            void navigate({ to: `/decks/${deck.id ?? ""}/edit` });
          }}
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
                        if (deck.id) onDelete?.(deck.id);
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
      <DropdownMenuItem onClick={handleAddToCollection}>
        Add to collection…
      </DropdownMenuItem>
    </DropdownMenu>
  );
};

const MyDecksPage = () => {
  // Gated by /_authenticated — caller is always a registered user here.
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { data: systemDecks = [], isLoading: loadingSystem } =
    useListDecksQuery(undefined, { refetchOnMountOrArgChange: true });
  const {
    data: myDecks = [],
    isLoading: loadingMine,
    refetch,
  } = useListMyDecksQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [deleteDeck] = useDeleteDeckMutation();
  const [createDeck] = useCreateDeckMutation();
  const [addElement] = useAddElementMutation();
  const confirm = useConfirm();

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete deck",
      message: "Delete this deck and all its questions?",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    await deleteDeck({ id }).unwrap();
    void refetch();
  };

  const handleCreateDeck = () => {
    const id = crypto.randomUUID();
    const name = "Untitled Deck";
    const firstSlide = buildFirstSlide(crypto.randomUUID());

    void dispatch(
      Ambi.util.upsertQueryData(
        "getDeck",
        { id },
        buildOptimisticDeck(id, name, firstSlide),
      ),
    );

    void navigate({
      to: "/decks/$deckId/edit",
      params: { deckId: id },
      search: { questionId: firstSlide.id },
    });

    void createDeck({ createDeckRequest: { id, name } })
      .unwrap()
      .then(() => addElement({ id, body: firstSlide }).unwrap())
      .catch((err: unknown) => {
        console.error("Failed to create deck", err);
      });
  };

  const userSystemDecks = systemDecks.filter((p) => p.isSystem);

  type Tab = "live" | "drafts" | "shared";
  const [tab, setTab] = useState<Tab>("live");
  // Owned = decks the caller is the OWNER of (or pre-backfill, has no role
  // but still appears in /api/decks/mine via the legacy creatorUserId path —
  // treat a missing role on a non-shared deck as owner).
  const ownedDecks = myDecks.filter(
    (d) => d.myRole == null || d.myRole === "OWNER",
  );
  const sharedDecks = myDecks.filter(
    (d) => d.myRole === "EDITOR" || d.myRole === "VIEWER",
  );
  // Draft = explicit DRAFT or legacy decks without a publishStatus field set.
  const draftDecks = ownedDecks.filter(
    (d) => (d.publishStatus ?? "DRAFT") === "DRAFT",
  );
  const liveDecks = ownedDecks.filter(
    (d) => (d.publishStatus ?? "DRAFT") !== "DRAFT",
  );
  const visibleDecks =
    tab === "drafts" ? draftDecks : tab === "shared" ? sharedDecks : liveDecks;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Decks</h1>
        <Btn onClick={handleCreateDeck}>New Deck</Btn>
      </div>

      <section className={styles.section}>
        <div className={styles.tabs} role='tablist' aria-label='Your decks'>
          <button
            type='button'
            role='tab'
            aria-selected={tab === "live"}
            className={[styles.tab, tab === "live" ? styles.tabActive : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => {
              setTab("live");
            }}>
            Live
            <span className={styles.tabCount}>{liveDecks.length}</span>
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={tab === "drafts"}
            className={[styles.tab, tab === "drafts" ? styles.tabActive : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => {
              setTab("drafts");
            }}>
            Drafts
            <span className={styles.tabCount}>{draftDecks.length}</span>
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={tab === "shared"}
            className={[styles.tab, tab === "shared" ? styles.tabActive : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => {
              setTab("shared");
            }}>
            Shared with me
            <span className={styles.tabCount}>{sharedDecks.length}</span>
          </button>
        </div>
        {loadingMine ? (
          <p className={styles.empty}>Loading…</p>
        ) : visibleDecks.length === 0 ? (
          <p className={styles.empty}>
            {tab === "drafts"
              ? "No drafts. Decks default to draft until you publish them."
              : tab === "shared"
                ? "Nothing shared with you yet. Owners can invite you from the Share button in their deck editor."
                : "No published decks yet. Hit Publish in the editor when you're ready."}
          </p>
        ) : (
          <div className={styles.grid}>
            {visibleDecks.map((deck) => (
              <DeckCardWithMenu
                key={deck.id}
                deck={deck}
                editable={tab !== "shared" || deck.myRole === "EDITOR"}
                onDelete={(id) => {
                  void handleDelete(id);
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Templates</h2>
        {loadingSystem ? (
          <p className={styles.empty}>Loading…</p>
        ) : (
          <div className={styles.grid}>
            {userSystemDecks.map((deck) => (
              <DeckCardWithMenu key={deck.id} deck={deck} editable={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export { MyDecksPage };
