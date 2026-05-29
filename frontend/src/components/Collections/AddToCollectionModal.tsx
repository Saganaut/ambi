// Modal body for the "Add to collection" action. Loads the caller's
// collections and lets them toggle the deck's membership in each one.
//
// Membership is derived client-side by checking each collection's
// `deckIds` for the target id — that keeps the action's response payload
// trivial (a single DeckCollectionResponse summary) and lets the cache-sync
// layer in apiEnhancements light the toggle up without a refetch.
//
// "+ New collection" at the bottom defers to CollectionCreateForm and
// then auto-adds the deck so the same gesture creates and files in one
// shot.
import { useState } from "react";
import { Btn } from "@/components/Common/Buttons/Btn";
import {
  useListMyCollectionsQuery,
  useAddDeckToCollectionMutation,
  useRemoveDeckFromCollectionMutation,
  useCreateCollectionMutation,
  type DeckCollectionResponse,
} from "@/store/AmbiApi";
import styles from "./AddToCollectionModal.module.css";

interface AddToCollectionModalProps {
  deckId: string;
  onClose: () => void;
}

const PAGE_SIZE = 50;

const AddToCollectionModal = ({
  deckId,
  onClose,
}: AddToCollectionModalProps) => {
  const { data, isLoading } = useListMyCollectionsQuery(
    { page: 0, size: PAGE_SIZE },
    { refetchOnMountOrArgChange: true },
  );

  const [addDeckToCollection, { isLoading: isAdding }] =
    useAddDeckToCollectionMutation();
  const [removeDeckFromCollection, { isLoading: isRemoving }] =
    useRemoveDeckFromCollectionMutation();
  const [createCollection, { isLoading: isCreating }] =
    useCreateCollectionMutation();

  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const collections: DeckCollectionResponse[] = data?.items ?? [];
  const isBusy = isAdding || isRemoving || isCreating;

  const handleToggle = (collection: DeckCollectionResponse) => {
    if (!collection.id || isBusy) return;
    const isMember = (collection.deckIds ?? []).includes(deckId);
    const mutation = isMember
      ? removeDeckFromCollection({ id: collection.id, deckId })
      : addDeckToCollection({
          id: collection.id,
          addDeckToCollectionRequest: { deckId },
        });
    void mutation.unwrap().catch((err: unknown) => {
      console.error("Failed to toggle deck in collection", err);
    });
  };

  const createAndAdd = async () => {
    const trimmed = newName.trim();
    if (trimmed === "" || isBusy) return;
    const id = crypto.randomUUID();
    try {
      await createCollection({
        createDeckCollectionRequest: { id, name: trimmed },
      }).unwrap();
      await addDeckToCollection({
        id,
        addDeckToCollectionRequest: { deckId },
      }).unwrap();
      setNewName("");
      setShowCreate(false);
    } catch (err) {
      console.error("Failed to create-and-add", err);
    }
  };

  return (
    <div className={styles.body}>
      {isLoading && <p className={styles.empty}>Loading collections…</p>}
      {!isLoading && collections.length === 0 && !showCreate && (
        <p className={styles.empty}>
          You don&apos;t have any collections yet — create one below.
        </p>
      )}
      {collections.length > 0 && (
        <ul className={styles.list} role='list'>
          {collections.map((col) => {
            const isMember = (col.deckIds ?? []).includes(deckId);
            return (
              <li key={col.id} className={styles.row}>
                <label className={styles.rowLabel}>
                  <input
                    type='checkbox'
                    checked={isMember}
                    disabled={isBusy}
                    onChange={() => {
                      handleToggle(col);
                    }}
                  />
                  <span className={styles.rowName}>{col.name}</span>
                  <span className={styles.rowMeta}>
                    {col.deckCount ?? 0} decks
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {showCreate ? (
        <form
          className={styles.createForm}
          onSubmit={(event) => {
            event.preventDefault();
            void createAndAdd();
          }}>
          <input
            autoFocus
            className={styles.createInput}
            placeholder='Collection name'
            value={newName}
            maxLength={100}
            onChange={(e) => {
              setNewName(e.target.value);
            }}
          />
          <Btn
            size='sm'
            type='submit'
            disabled={isBusy || newName.trim() === ""}>
            Create &amp; add
          </Btn>
          <Btn
            size='sm'
            type='button'
            fill='ghost'
            onClick={() => {
              setShowCreate(false);
              setNewName("");
            }}>
            Cancel
          </Btn>
        </form>
      ) : (
        <Btn
          size='sm'
          fill='ghost'
          onClick={() => {
            setShowCreate(true);
          }}>
          + New collection
        </Btn>
      )}

      <div className={styles.footer}>
        <Btn fill='ghost' onClick={onClose}>
          Done
        </Btn>
      </div>
    </div>
  );
};

export { AddToCollectionModal };
