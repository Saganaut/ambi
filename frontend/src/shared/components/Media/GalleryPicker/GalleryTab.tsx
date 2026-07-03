// Gallery tab: browse the user's stored images and pick one. Selecting a tile
// fires onPick with the stored AppImage (no crop step — existing images are
// already framed). Search filters by the gallery item's name.
import { useMemo, useState } from "react";
import { Input } from "@components/Forms/Input/Input/Input";
import { EmptyState } from "@ui/EmptyState/EmptyState";
import { Loader } from "@ui/Loader/Loader";
import {
  useListImagesQuery,
  type AppImage,
  type GalleryImageResponse,
} from "@features/gallery/store/galleryApi.gen";
import { resolveImageUrl } from "@utils/image";
import styles from "./GalleryPicker.module.css";

// One large page is plenty for a browse-and-pick surface; pagination UI can come
// later if a gallery ever outgrows it.
const PAGE = { page: 0, size: 100 };

interface GalleryTabProps {
  galleryId?: string;
  /** True when the parent's gallery-singleton fetch failed (so no id is coming). */
  galleryError?: boolean;
  onPick: (image: AppImage) => void;
}

const GalleryTab = ({ galleryId, galleryError, onPick }: GalleryTabProps) => {
  const {
    data: page,
    isError: imagesError,
  } = useListImagesQuery(
    { id: galleryId ?? "", pageable: PAGE },
    { skip: !galleryId },
  );

  // If the gallery singleton or the images fetch failed, show an error state —
  // otherwise `!galleryId` (below) would spin forever, since a failed gallery
  // fetch never yields an id.
  const showError = galleryError === true || imagesError;

  // The images query is skipped until the gallery singleton resolves an id, so
  // it reports no data during that first round-trip. Treat "no id yet" or "id
  // but images not resolved yet" as loading, so the tab goes spinner → grid
  // without flashing the empty state between the two dependent requests.
  const showLoading = !showError && (!galleryId || !page);

  const images = useMemo(() => page?.content ?? [], [page]);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return images;
    return images.filter((img) => (img.name ?? "").toLowerCase().includes(q));
  }, [images, search]);

  const renderTile = (img: GalleryImageResponse) => {
    const name = img.name ?? "Untitled";
    // Picker tiles are small — SM (200px) is the right tier for the thumb.
    const thumb = resolveImageUrl(img.image, "SM", img.id, 200, 200, false);
    return (
      <button
        type='button'
        key={img.id}
        className={styles.tile}
        onClick={() => {
          onPick(img.image);
        }}>
        {thumb ? (
          <img src={thumb} alt={name} className={styles.thumb} />
        ) : (
          <div className={styles.thumb} aria-hidden='true' />
        )}
        <span className={styles.tileName} title={name}>
          {name}
        </span>
      </button>
    );
  };

  return (
    <div className={styles.galleryTab}>
      <div className={styles.searchInput}>
        <Input
          type='text'
          fullWidth
          ariaLabel='Search gallery by name'
          placeholder='Search by name…'
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
        />
      </div>

      {showError && (
        <div className={styles.stateFill}>
          <EmptyState
            className={styles.empty}
            title='Unable to load images'
            message='Something went wrong. Please try again.'
          />
        </div>
      )}
      {!showError && showLoading && (
        <div className={styles.stateFill}>
          <Loader />
        </div>
      )}
      {!showError && !showLoading && filtered.length === 0 && (
        <div className={styles.stateFill}>
          <EmptyState
            className={styles.empty}
            title='No images yet'
            message={
              images.length === 0
                ? "Upload an image or add one from the web on the Upload tab."
                : "No images match your search."
            }
          />
        </div>
      )}
      {!showError && !showLoading && filtered.length > 0 && (
        <div className={styles.grid}>{filtered.map(renderTile)}</div>
      )}
    </div>
  );
};

export { GalleryTab };
