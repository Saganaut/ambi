// Gallery management surface on the Account page. Lists the images in the
// caller's personal gallery (the per-user singleton at `GET /api/galleries/mine`)
// and lets them add new ones or remove existing ones. Adding reuses the same
// `GalleryPicker` modal the slide editors use — the picker persists a pasted URL
// via `addImage`, and the gallery cache-sync rules (see `enhancements/gallery`)
// fold the result back into this list, so no manual refetch is needed.
//
// Every image here belongs to the caller (it's *their* gallery), so there are no
// owner-vs-shared affordances — just add and remove. Org-shared galleries are a
// separate surface and aren't managed from this tab.
import { useMemo, useState } from "react";
import { Btn } from "@ui/Buttons/Btn";
import { EmptyState } from "@ui/EmptyState/EmptyState";
import { GalleryPicker } from "@components/Media/GalleryPicker/GalleryPicker";
import { useConfirm } from "@components/ConfirmDialog/useConfirm";
import { useModal } from "@hooks/useModal";
import { type GalleryImageResponse, useGetMyGalleryQuery, useListImagesQuery, useRemoveImageMutation } from "@features/gallery/store/galleryApi.gen";
import { resolveImageUrl } from "@utils/image";
import { extractErrorMessage } from "@utils/utils";
import accountStyles from "./AccountPage.module.css";
import styles from "./GallerySection.module.css";

// One large page is plenty for a personal gallery; pagination UI can come later
// if a gallery ever outgrows it. Mirrors the GalleryPicker's PAGE constant.
const PAGE = { page: 0, size: 100 };

const GallerySection = () => {
  const { data: gallery, isLoading: isGalleryLoading } = useGetMyGalleryQuery();
  const galleryId = gallery?.id;

  const { data: page, isLoading: isImagesLoading } = useListImagesQuery(
    { id: galleryId ?? "", pageable: PAGE },
    { skip: !galleryId },
  );
  const images = useMemo(() => page?.content ?? [], [page]);

  const [removeImage] = useRemoveImageMutation();
  const { openModal, closeModal } = useModal();
  const confirm = useConfirm();
  const [error, setError] = useState<string | null>(null);

  const isLoading = isGalleryLoading || isImagesLoading;

  // The picker owns the add flow (paste URL → persist via addImage). We just
  // close the modal once an image is picked; the gallery cache-sync rule keeps
  // this list current, so there's nothing else to do here.
  const handleAdd = () => {
    openModal({
      title: "Add image",
      content: (
        <GalleryPicker
          onPick={() => {
            closeModal();
          }}
          onClose={closeModal}
        />
      ),
    });
  };

  const handleDelete = async (image: GalleryImageResponse) => {
    if (!galleryId) return;
    const ok = await confirm({
      title: "Delete image",
      message: `Delete "${image.name ?? "this image"}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    try {
      await removeImage({ id: galleryId, imageId: image.id }).unwrap();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Failed to delete image."));
    }
  };

  const renderCard = (image: GalleryImageResponse) => {
    const name = image.name ?? "Untitled";
    // Management cards are ~200px wide — SM is the right tier for the thumb.
    const thumb = resolveImageUrl(image.image, "SM", image.id, 200, 200, false);
    return (
      <div key={image.id} className={styles.card}>
        {thumb ? (
          <img src={thumb} alt={name} className={styles.thumb} />
        ) : (
          <div className={styles.thumb} aria-hidden='true' />
        )}
        <p className={styles.cardName} title={name}>
          {name}
        </p>
        <div className={styles.cardActions}>
          <Btn
            size='sm'
            variant='error'
            fill='ghost'
            onClick={() => {
              void handleDelete(image);
            }}>
            Delete
          </Btn>
        </div>
      </div>
    );
  };

  return (
    <section className={accountStyles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={accountStyles.sectionTitle}>Image Gallery</h2>
        <Btn onClick={handleAdd} disabled={!galleryId}>
          + Add image
        </Btn>
      </div>

      {isLoading && <p>Loading…</p>}

      {!isLoading && images.length === 0 && (
        <EmptyState
          title='No images yet'
          message='Add images here, then pick them when authoring slides.'
          action={
            <Btn onClick={handleAdd} disabled={!galleryId}>
              Add your first image
            </Btn>
          }
        />
      )}

      {!isLoading && images.length > 0 && (
        <div className={styles.grid}>{images.map(renderCard)}</div>
      )}

      {error && <p className={accountStyles.error}>{error}</p>}
    </section>
  );
};

export { GallerySection };
