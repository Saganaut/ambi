// /my-decks/collections — paginated grid of the caller's curated deck
// collections. Visually mirrors the my-decks card surface; tapping a tile
// drills into the collection's ordered deck list at /collections/$id.
// "New collection" opens a modal-driven create flow that seeds the cache
// optimistically and navigates to the new collection's detail view as soon
// as the server confirms the id, the same shape as the deck-create flow.
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Btn } from "@/components/Common/Buttons/Btn";
import { Pagination } from "@/components/Common/Pagination/Pagination";
import { useModal } from "@/context/useModal";
import {
  useListMyCollectionsQuery,
  useDeleteCollectionMutation,
} from "@/store/BrainFlexApi";
import { useConfirm } from "@/components/Common/ConfirmDialog/useConfirm";
import { resolveDeckCover } from "@/utils/deckImages";
import { CollectionCreateForm } from "./CollectionCreateForm";
import styles from "./CollectionsPage.module.css";

const PAGE_SIZE = 24;

const CollectionsPage = () => {
  // Gated by /_authenticated — caller is always a registered user here.
  const navigate = useNavigate();
  const { openModal, closeModal } = useModal();
  const confirm = useConfirm();

  const [page, setPage] = useState(0);
  const { data, isFetching } = useListMyCollectionsQuery(
    { page, size: PAGE_SIZE },
    { refetchOnMountOrArgChange: true },
  );

  const [deleteCollection] = useDeleteCollectionMutation();

  const items = data?.items ?? [];
  const total = data?.totalElements ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleCreate = () => {
    openModal({
      title: "New collection",
      content: (
        <CollectionCreateForm
          onCancel={closeModal}
          onCreated={(id) => {
            closeModal();
            void navigate({
              to: "/collections/$collectionId",
              params: { collectionId: id },
            });
          }}
        />
      ),
    });
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Delete collection",
      message: `Delete "${name}"? The decks inside stay, only the grouping is removed.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    await deleteCollection({ id }).unwrap();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Collections</h1>
        <span className={styles.subtitle}>
          {isFetching ? "Loading…" : `${String(total)} collections`}
        </span>
        <Btn onClick={handleCreate}>New collection</Btn>
      </header>

      {items.length === 0 && !isFetching ? (
        <button
          type='button'
          className={styles.emptyTile}
          onClick={handleCreate}
          aria-label='Create your first collection'>
          <span className={styles.emptyIcon} aria-hidden='true'>
            <PlusIcon />
          </span>
          <span className={styles.emptyTitle}>
            Create your first collection
          </span>
          <span className={styles.emptySubtitle}>
            Group decks into a course, a series, or just a folder.
          </span>
        </button>
      ) : (
        <div className={styles.grid}>
          {items.map((col) => (
            <div key={col.id} className={styles.cardWrap}>
              <Link
                to='/collections/$collectionId'
                params={{ collectionId: col.id ?? "" }}
                className={styles.card}>
                <img
                  src={resolveDeckCover(col.cover, col.id)}
                  alt=''
                  className={styles.cover}
                  loading='lazy'
                />
                <span className={styles.name}>{col.name}</span>
                <span className={styles.meta}>
                  {col.deckCount ?? 0} decks
                  {col.visibility && col.visibility !== "PRIVATE"
                    ? ` · ${col.visibility.toLowerCase()}`
                    : ""}
                </span>
                {col.description != null && col.description !== "" && (
                  <span className={styles.desc}>{col.description}</span>
                )}
              </Link>
              <div className={styles.cardActions}>
                <Btn
                  size='sm'
                  variant='error'
                  onClick={() => {
                    void handleDelete(
                      col.id ?? "",
                      col.name ?? "this collection",
                    );
                  }}>
                  Delete
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <div className={styles.pager}>
          <Pagination
            page={page}
            pageCount={pageCount}
            disabled={isFetching}
            ariaLabel='Collections pagination'
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
};

export { CollectionsPage };
