// Modal body for choosing an image, with two tabs:
//   • Gallery — pick one of the user's stored images (GalleryTab).
//   • Upload  — bring in a new one by file or web URL, crop it, name it, and add
//               alt text before it's stored (UploadTab + ImageCropEditor).
// Either way the chosen image is handed to the caller via onPick(AppImage); the
// caller closes the modal. Every image the picker yields is now a stored,
// S3-backed AppImage — pasted URLs are fetched + stored too, not kept as bare
// external references.
//
// The Gallery tab is a *two-step* surface: a single click selects a tile (which
// enables the footer's Insert and Delete actions) rather than inserting, so a
// stray click can't drop an image onto the canvas and images can be pruned
// without a trip to Account → Gallery. Double-clicking a tile is the fast path
// and inserts straight away; from the keyboard, Enter/Space on the tile that's
// already selected does the same, so reaching Insert never means tabbing past
// the rest of the grid. Deleting confirms inline in the footer — the
// picker occupies the app's one global modal slot, so a confirm dialog would
// evict it (see useGalleryPickerSelection).
//
// The gallery is the per-user singleton (`GET /api/galleries/mine`); its images
// are the paginated sub-resource (`GET /api/galleries/{id}/images`). Callers that
// target a fixed-shape slot (deck/slide background, avatar, …) pass cropWidth +
// cropHeight to constrain the Upload tab's crop box; it defaults to 16:9. A
// caller whose slot takes the image's own shape (Place-on-Image's backing
// image) passes cropAspect="source" instead, so uploads keep their aspect
// ratio rather than being clipped to a frame.
import { useRef, useState } from "react";
import { Btn } from "@ui/Buttons/Btn";
import { ErrorFallback } from "@ui/BoundaryFallbacks/ErrorFallback";
import { ErrorBoundary } from "@ui/ErrorBoundary/ErrorBoundary";
import { Tabs, type TabsItem } from "@ui/Tabs/Tabs";
import {
  useGetMyGalleryQuery,
  type AppImage,
} from "@features/gallery/store/galleryApi.gen";
import { GalleryTab } from "./GalleryTab";
import { UploadTab } from "./UploadTab";
import { useGalleryPickerSelection } from "./useGalleryPickerSelection";
import styles from "./GalleryPicker.module.css";

// Used when a caller doesn't constrain the crop to a specific slot shape.
const DEFAULT_CROP_ASPECT = 16 / 9;

interface GalleryPickerProps {
  onPick: (image: AppImage) => void;
  onClose: () => void;
  /** Prefills the Upload tab's "paste URL" field (and opens that tab first). */
  initialUrl?: string;
  /** Target slot dimensions; together they set the crop box aspect ratio. */
  cropWidth?: number;
  cropHeight?: number;
  /** "source": the crop box takes each uploaded image's own aspect ratio
   *  (wins over cropWidth/cropHeight). */
  cropAspect?: "source";
}

type PickerTab = "gallery" | "upload";

const GalleryPicker = ({
  onPick,
  onClose,
  initialUrl,
  cropWidth,
  cropHeight,
  cropAspect,
}: GalleryPickerProps) => {
  const { data: gallery, isError: galleryError } = useGetMyGalleryQuery();
  const galleryId = gallery?.id;
  const aspect: number | "source" =
    cropAspect ??
    (cropWidth && cropHeight ? cropWidth / cropHeight : DEFAULT_CROP_ASPECT);
  const [tab, setTab] = useState<PickerTab>(initialUrl ? "upload" : "gallery");
  const selection = useGalleryPickerSelection(galleryId);
  const { selected } = selection;
  const selectedName = selected?.name ?? "this image";

  const insertSelected = () => {
    if (selected) onPick(selected.image);
  };

  // Deselect-on-outside-click. A click that lands on a control (a tile, a tab,
  // one of the footer buttons) keeps its own semantics; a click on inert chrome
  // — the search row, the grid's padding, the picker's own gutters — means "not
  // that one after all" and clears the selection. The footer is exempt as a
  // whole, not just its buttons: the delete confirmation's prompt is a bare
  // <span role="status">, and clicking the very text asking "delete this?"
  // must not quietly cancel the thing it's asking about.
  const footerRef = useRef<HTMLDivElement>(null);
  const handlePickerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target && (target.closest("button") || footerRef.current?.contains(target))) {
      return;
    }
    selection.clear();
  };

  const items: TabsItem[] = [
    {
      id: "gallery",
      label: "Gallery",
      panel: (
        <GalleryTab
          galleryId={galleryId}
          galleryError={galleryError}
          onPick={onPick}
          selectedId={selected?.id}
          onSelect={selection.select}
        />
      ),
    },
    {
      id: "upload",
      label: "Upload",
      panel: (
        <UploadTab
          galleryId={galleryId}
          aspect={aspect}
          initialUrl={initialUrl}
          onPicked={onPick}
        />
      ),
    },
  ];

  return (
    <div className={styles.picker} onClick={handlePickerClick}>
      <ErrorBoundary
        boundaryName="gallery-picker"
        fallback={<ErrorFallback message="Something went wrong loading the image picker." />}
      >
        <Tabs
          className={styles.pickerTabs}
          items={items}
          value={tab}
          onChange={(id) => {
            setTab(id as PickerTab);
            // The grid — and so the thing the actions act on — is gone once the
            // Upload tab is showing; don't leave them armed against it.
            selection.clear();
          }}
          ariaLabel='Image source'
        />
      </ErrorBoundary>
      <div className={styles.formActions} ref={footerRef}>
        {selection.isConfirmingDelete ? (
          <>
            <span className={styles.confirmPrompt} role='status'>
              Delete “{selectedName}”? This can’t be undone.
            </span>
            <Btn
              variant='error'
              isLoading={selection.isDeleting}
              onClick={() => {
                void selection.confirmDelete();
              }}>
              Confirm delete
            </Btn>
            <Btn variant='secondary' onClick={selection.cancelDelete}>
              Cancel
            </Btn>
          </>
        ) : (
          <>
            <Btn variant='primary' disabled={!selected} onClick={insertSelected}>
              Insert
            </Btn>
            <Btn
              variant='error'
              fill='ghost'
              disabled={!selected}
              onClick={selection.requestDelete}>
              Delete
            </Btn>
          </>
        )}
        <span className={styles.toolbarSpacer} />
        <Btn onClick={onClose}>Close</Btn>
      </div>
      {selection.deleteError && (
        <p className={styles.error}>{selection.deleteError}</p>
      )}
    </div>
  );
};

export { GalleryPicker };
