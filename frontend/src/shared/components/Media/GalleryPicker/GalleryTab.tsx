// Gallery tab: browse the user's stored images and pick one. Search filters by
// the gallery item's name. Picking reports the whole gallery item and this tab
// takes it no further — whether the pick is inserted as-is or re-cropped first
// is the parent's decision (see GalleryPicker's `cropGalleryPicks`).
//
// Two interaction modes, chosen by the parent:
//   • click-to-pick (default) — a single click fires onPick straight away. Used
//     by the AvatarPicker, whose gallery tab has no contextual action bar.
//   • two-step selection (pass onSelect) — a single click only *selects* the
//     tile, so the parent can offer Insert/Delete against it; a double-click is
//     the power-user fast path that picks immediately, and re-clicking the
//     selected tile deselects it.
//
// Keyboard parity for the two-step mode: activating a tile with Enter/Space
// selects it, and activating the *already-selected* tile picks it — the
// keyboard twin of the double-click fast path. Without that, the only route
// from a focused tile to the parent's Insert button would be tabbing past every
// remaining tile in the grid. Keyboard activation is told apart from a mouse
// click by `event.detail`, which is 0 for Enter/Space and ≥1 for a real click.
import { useMemo, useState } from "react";
import CheckIcon from "@assets/icons/status/check-solid.svg?react";
import { Input } from "@components/Forms/Input/Input/Input";
import { EmptyState } from "@ui/EmptyState/EmptyState";
import { Loader } from "@ui/Loader/Loader";
import {
  useListImagesQuery,
  type GalleryImageResponse,
} from "@features/gallery/store/galleryApi.gen";
import { IMAGE_QUERY_REFRESH } from "@/shared/store/imageRefreshPolicy.ts";
import { resolveImageUrl } from "@utils/image";
import styles from "./GalleryPicker.module.css";

// One large page is plenty for a browse-and-pick surface; pagination UI can come
// later if a gallery ever outgrows it.
const PAGE = { page: 0, size: 100 };

interface GalleryTabProps {
  galleryId?: string;
  /** True when the parent's gallery-singleton fetch failed (so no id is coming). */
  galleryError?: boolean;
  /**
   * The chosen gallery item — the whole record, not just its `image`, so a
   * parent that post-processes the pick (the picker's crop-on-insert step) has
   * the id to re-read its bytes by and the name/alt text to carry over.
   */
  onPick: (item: GalleryImageResponse) => void;
  /** Id of the selected tile — only meaningful alongside `onSelect`. */
  selectedId?: string;
  /**
   * Opt into two-step selection. When supplied, a single click selects the tile
   * (re-clicking the selected one reports null to deselect) instead of picking,
   * and only a double-click — or Enter/Space on the already-selected tile —
   * fires `onPick`. Omit it for click-to-pick.
   */
  onSelect?: (image: GalleryImageResponse | null) => void;
}

const GalleryTab = ({
  galleryId,
  galleryError,
  onPick,
  selectedId,
  onSelect,
}: GalleryTabProps) => {
  const {
    data: page,
    isError: imagesError,
  } = useListImagesQuery(
    { id: galleryId ?? "", pageable: PAGE },
    // Tiles render presigned image URLs; keep them fresh so reopening the picker
    // after idle never shows an expired URL. See imageRefreshPolicy.
    { skip: !galleryId, ...IMAGE_QUERY_REFRESH },
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

  const selectable = onSelect !== undefined;

  const renderTile = (img: GalleryImageResponse) => {
    const name = img.name ?? "Untitled";
    // Picker tiles are small — SM (200px) is the right tier for the thumb.
    const thumb = resolveImageUrl(img.image, "SM", img.id, 200, 200, false);
    const isSelected = selectable && img.id === selectedId;
    return (
      <button
        type='button'
        key={img.id}
        className={styles.tile}
        // A selectable tile is a toggle, so its state belongs on aria-pressed —
        // which is also what the selected styling hangs off. In click-to-pick
        // mode the tile is a plain action button and carries no pressed state.
        aria-pressed={selectable ? isSelected : undefined}
        onClick={(event) => {
          if (!onSelect) {
            onPick(img);
            return;
          }
          // Enter/Space report detail 0. Activating an already-selected tile
          // from the keyboard picks it, mirroring the double-click fast path;
          // deselecting stays a mouse gesture (re-click, or click off the
          // grid), so no keystroke can silently disarm the footer's actions.
          if (event.detail === 0) {
            if (isSelected) onPick(img);
            else onSelect(img);
            return;
          }
          // The second click of a double-click would otherwise toggle the
          // selection straight back off; leave it alone and let onDoubleClick
          // do the picking.
          if (event.detail > 1) return;
          onSelect(isSelected ? null : img);
        }}
        // Double-clicking a tile that was *already* selected shows a brief
        // deselect: the first click toggles it off before `dblclick` fires.
        // Nothing in the event stream says a second click is coming, so the
        // only way to suppress it would be to defer every toggle behind a
        // double-click timer — machinery this codebase has no precedent for,
        // for a flicker that ends with the picker closing anyway.
        onDoubleClick={
          selectable
            ? () => {
                onPick(img);
              }
            : undefined
        }>
        <span className={styles.thumbFrame}>
          {thumb ? (
            <img src={thumb} alt={name} className={styles.thumb} />
          ) : (
            <div className={styles.thumb} aria-hidden='true' />
          )}
          {isSelected && (
            <span className={styles.tileSelectedBadge} aria-hidden='true'>
              <CheckIcon className={styles.tileSelectedIcon} />
            </span>
          )}
        </span>
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
