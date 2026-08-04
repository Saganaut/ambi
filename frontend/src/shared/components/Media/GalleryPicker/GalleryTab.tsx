// Gallery tab: browse the user's stored images and pick one. Browsing is
// server-driven — the page, the sort field/direction and the name search are all
// query params on `listImages`, so the grid shows one true page of the gallery
// rather than a client filter over whatever happened to be fetched. Picking
// reports the whole gallery item and this tab takes it no further — whether the
// pick is inserted as-is or cropped first is the parent's decision (see
// GalleryPicker's crop config).
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
import { useEffect, useState } from "react";
import { ChevronUpIcon } from "@heroicons/react/24/outline";
import CheckIcon from "@assets/icons/status/check-solid.svg?react";
import { Dropdown } from "@components/Forms/Input/Dropdown/Dropdown";
import { Input } from "@components/Forms/Input/Input/Input";
import { EmptyState } from "@ui/EmptyState/EmptyState";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { Loader } from "@ui/Loader/Loader";
import { Pagination } from "@ui/Pagination/Pagination";
import {
  useListImagesQuery,
  type GalleryImageResponse,
} from "@features/gallery/store/galleryApi.gen";
import { IMAGE_QUERY_REFRESH } from "@/shared/store/imageRefreshPolicy.ts";
import { resolveImageUrl } from "@utils/image";
import styles from "./GalleryPicker.module.css";

// One 3×2 grid per page, matching the picker's fixed-height body.
const PAGE_SIZE = 6;

// Long enough that a typed word is one request, short enough to feel live.
const SEARCH_DEBOUNCE_MS = 300;

/** The fields the backend allows sorting images by (anything else it ignores). */
type SortField = "createdAt" | "name";
type SortDirection = "asc" | "desc";

const SORT_OPTIONS = [
  { value: "createdAt", label: "Date" },
  { value: "name", label: "Name" },
];

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
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  // The field mirrors keystrokes; only the settled value becomes a request.
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchDraft.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [searchDraft]);

  const {
    // `data` (not `currentData`) holds the last page fetched for *any* args, so
    // paging or re-sorting swaps the grid in place instead of blanking it back
    // to the spinner between requests.
    data: imagePage,
    isFetching,
    isError: imagesError,
  } = useListImagesQuery(
    {
      id: galleryId ?? "",
      search: search === "" ? undefined : search,
      pageable: {
        page,
        size: PAGE_SIZE,
        sort: [`${sortField},${sortDirection}`],
      },
    },
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
  const showLoading = !showError && (!galleryId || !imagePage);

  const images = imagePage?.content ?? [];
  const pageCount = imagePage?.page?.totalPages ?? 0;

  // Deleting the last image of the final page can strand the pager past the end;
  // walk it back rather than showing a blank grid. Only once the request has
  // settled — mid-flight the totals still describe the page being replaced.
  useEffect(() => {
    if (!isFetching && pageCount > 0 && page > pageCount - 1) {
      setPage(pageCount - 1);
    }
  }, [isFetching, page, pageCount]);

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
      <div className={styles.toolbarRow}>
        <div className={styles.searchInput}>
          <Input
            type='text'
            fullWidth
            withPadding={false}
            ariaLabel='Search gallery by name'
            placeholder='Search by name…'
            value={searchDraft}
            onChange={(e) => {
              setSearchDraft(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <div className={styles.sortControls}>
          <span className={styles.sortLabel}>Sort by</span>
          <div className={styles.sortSelect}>
            <Dropdown
              ariaLabel='Sort by'
              fullWidth
              withPadding={false}
              options={SORT_OPTIONS}
              value={[sortField]}
              onChange={(values) => {
                setSortField(
                  (values[0] as SortField | undefined) ?? "createdAt",
                );
                setPage(0);
              }}
            />
          </div>
          <IconBtn
            fill='ghost'
            size='sm'
            icon={<ChevronUpIcon className={styles.sortDirectionIcon} />}
            className={
              sortDirection === "desc" ? styles.sortDirectionDesc : undefined
            }
            aria-label={
              sortDirection === "asc" ? "Sort descending" : "Sort ascending"
            }
            onClick={() => {
              setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
              setPage(0);
            }}
          />
        </div>
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
      {!showError && !showLoading && images.length === 0 && (
        <div className={styles.stateFill}>
          <EmptyState
            className={styles.empty}
            title={search === "" ? "No images yet" : "No matching images"}
            message={
              search === ""
                ? "Upload an image or add one from the web on the Upload tab."
                : "No images match your search."
            }
          />
        </div>
      )}
      {!showError && !showLoading && images.length > 0 && (
        <div className={styles.grid} aria-busy={isFetching}>
          {images.map(renderTile)}
        </div>
      )}

      {!showError && !showLoading && (
        <div className={styles.pager}>
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            ariaLabel='Gallery pages'
          />
        </div>
      )}
    </div>
  );
};

export { GalleryTab };
