// /collections/$collectionId — detail view for a single curated deck
// collection. Shows the ordered deck list as a sortable grid (drag handles
// from @dnd-kit) plus an "edit metadata" affordance for the owner. Reorder
// is optimistic: dropping rewrites the cached deckIds array immediately,
// and the server-confirmed snapshot lands via apiEnhancements.
//
// The route param is read here via `getRouteApi` so the route stub file
// can stay export-only-components-clean for react-refresh.
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import {
  useGetCollectionQuery,
  useReorderCollectionDecksMutation,
  useRemoveDeckFromCollectionMutation,
  type DeckCollectionResponse,
  type DeckResponse,
} from "@/store/AmbiApi";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAppDispatch } from "@/store/hooks";
import { Ambi } from "@/store/AmbiApi";
import { Btn } from "@/components/Common/Buttons/Btn";
import { useConfirm } from "@/components/Common/ConfirmDialog/useConfirm";
import { resolveDeckCover } from "@/utils/deckImages";
import styles from "./CollectionDetailPage.module.css";

const routeApi = getRouteApi("/collections/$collectionId");

const DeckTile = ({
  deck,
  index,
  isOwner,
  onRemove,
}: {
  deck: DeckResponse;
  index: number;
  isOwner: boolean;
  onRemove: (deckId: string) => void;
}) => {
  // useSortable needs a string id; fall back to index so the empty-id case
  // (shouldn't happen on a server-backed deck) doesn't collide.
  const sortableId = deck.id ?? `idx-${String(index)}`;
  const { ref, isDragging } = useSortable({ id: sortableId, index });
  const navigate = useNavigate();

  return (
    <div
      ref={ref}
      className={[styles.tile, isDragging ? styles.isDragging : ""]
        .filter(Boolean)
        .join(" ")}
      onClick={() => {
        if (deck.id == null) return;
        void navigate({
          to: "/decks/$deckId/edit",
          params: { deckId: deck.id },
          search: { questionId: undefined },
        });
      }}>
      <img
        src={resolveDeckCover(deck.cover, deck.id)}
        alt=''
        className={styles.cover}
        loading='lazy'
      />
      <span className={styles.name}>{deck.name}</span>
      <span className={styles.meta}>
        {deck.elementCount ?? 0} elements
        {deck.tags && deck.tags.length > 0 ? ` · ${deck.tags[0]}` : ""}
      </span>
      {isOwner && deck.id != null && (
        <div
          className={styles.tileActions}
          onClick={(e) => {
            e.stopPropagation();
          }}>
          <Btn
            size='sm'
            fill='ghost'
            onClick={() => {
              if (deck.id != null) onRemove(deck.id);
            }}>
            Remove
          </Btn>
        </div>
      )}
      <span className={styles.dragHint} aria-hidden='true'>
        ⋮⋮
      </span>
    </div>
  );
};

const CollectionHeader = ({
  collection,
}: {
  collection: DeckCollectionResponse;
}) => (
  <header className={styles.header}>
    <h1 className={styles.title}>{collection.name}</h1>
    <span className={styles.subtitle}>
      {collection.deckCount ?? 0} decks
      {collection.visibility && collection.visibility !== "PRIVATE"
        ? ` · ${collection.visibility.toLowerCase()}`
        : ""}
    </span>
    {collection.description != null && collection.description !== "" && (
      <p className={styles.description}>{collection.description}</p>
    )}
  </header>
);

const CollectionDetailPage = () => {
  const { collectionId } = routeApi.useParams();
  const userState = useCurrentUser();
  const dispatch = useAppDispatch();
  const confirm = useConfirm();

  const { data, isLoading, isError } = useGetCollectionQuery(
    { id: collectionId },
    { refetchOnMountOrArgChange: true },
  );

  const [reorderCollectionDecks] = useReorderCollectionDecksMutation();
  const [removeDeckFromCollection] = useRemoveDeckFromCollectionMutation();

  if (isLoading) {
    return (
      <div className={styles.page}>
        <p className={styles.empty}>Loading…</p>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className={styles.page}>
        <p className={styles.empty}>Collection not found or unavailable.</p>
      </div>
    );
  }

  const decks = data.decks ?? [];
  const isOwner =
    userState.state === "registered" && userState.user.id === data.ownerUserId;

  const handleDragEnd = (event: {
    operation: {
      source: {
        id?: string | number;
        initialIndex?: number;
        index?: number;
      } | null;
    };
  }) => {
    const { source } = event.operation;
    if (
      source?.initialIndex == null ||
      source.index == null ||
      source.initialIndex === source.index
    )
      return;
    const reordered = [...decks];
    const [moved] = reordered.splice(source.initialIndex, 1);
    reordered.splice(source.index, 0, moved);
    const nextIds = reordered
      .map((d) => d.id)
      .filter((id): id is string => !!id);
    if (nextIds.length !== decks.length) return;

    // Optimistic patch — the apiEnhancements onQueryStarted ALSO patches
    // getCollection, but we patch here first so the drop-frame animation
    // settles on the correct order before the mutation even fires.
    dispatch(
      Ambi.util.updateQueryData(
        "getCollection",
        { id: collectionId },
        (draft) => {
          draft.deckIds = nextIds;
          draft.decks = reordered;
        },
      ),
    );

    void reorderCollectionDecks({
      id: collectionId,
      reorderCollectionDecksRequest: { deckIds: nextIds },
    })
      .unwrap()
      .catch((err: unknown) => {
        console.error("Failed to reorder decks", err);
      });
  };

  const handleRemove = async (deckId: string) => {
    const ok = await confirm({
      title: "Remove deck",
      message:
        "Remove this deck from the collection? The deck itself isn't deleted.",
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!ok) return;
    await removeDeckFromCollection({ id: collectionId, deckId }).unwrap();
  };

  const grid = (
    <div className={styles.grid}>
      {decks.map((deck, index) => (
        <DeckTile
          key={deck.id}
          deck={deck}
          index={index}
          isOwner={isOwner}
          onRemove={(id) => {
            void handleRemove(id);
          }}
        />
      ))}
    </div>
  );

  return (
    <div className={styles.page}>
      <CollectionHeader collection={data} />
      {decks.length === 0 ? (
        <p className={styles.empty}>
          {isOwner
            ? "Nothing in this collection yet. Right-click a deck to add it here."
            : "This collection is empty."}
        </p>
      ) : isOwner ? (
        <DragDropProvider
          onDragEnd={(event) => {
            handleDragEnd(event);
          }}>
          {grid}
        </DragDropProvider>
      ) : (
        grid
      )}
    </div>
  );
};

export { CollectionDetailPage };
