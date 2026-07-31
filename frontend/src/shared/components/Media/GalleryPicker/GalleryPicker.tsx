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
//
// Those aspects only ever constrained the Upload tab, so a Gallery-tab pick
// could still drop an arbitrarily shaped image into a fixed-shape slot. Callers
// for whom that shape is load-bearing (the square slide-option thumbnails) pass
// cropGalleryPicks: every gallery pick then routes through the same crop editor
// first and is stored as a NEW gallery image, so the original is left intact and
// the slot gets bytes cut to its own frame.
import { useEffect, useRef, useState } from "react";
import { Btn } from "@ui/Buttons/Btn";
import { ErrorFallback } from "@ui/BoundaryFallbacks/ErrorFallback";
import { ErrorBoundary } from "@ui/ErrorBoundary/ErrorBoundary";
import { Tabs, type TabsItem } from "@ui/Tabs/Tabs";
import {
  useGetMyGalleryQuery,
  type AppImage,
  type GalleryImageResponse,
} from "@features/gallery/store/galleryApi.gen";
import {
  fetchGalleryImageFile,
  fetchRemoteImage,
} from "@utils/imageEditing";
import { extractErrorMessage } from "@utils/utils";
import { CropAndSaveStep } from "./CropAndSaveStep";
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
  /**
   * Route Gallery-tab picks through the crop editor at the caller's aspect
   * before insertion, storing the result as a new gallery image. For slots whose
   * shape is load-bearing (slide-option thumbnails are square); leave it off
   * where an existing image can be inserted as it stands.
   */
  cropGalleryPicks?: boolean;
}

type PickerTab = "gallery" | "upload";

/** A gallery pick being re-cropped: its source bytes plus the prefills it carries. */
interface CropStep {
  /** Object URL of the fetched source bytes; revoked when the step is left. */
  objectUrl: string;
  name: string;
  altText: string;
}

const GalleryPicker = ({
  onPick,
  onClose,
  initialUrl,
  cropWidth,
  cropHeight,
  cropAspect,
  cropGalleryPicks,
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

  // The crop-on-pick step (cropGalleryPicks only). Its source bytes are fetched
  // on demand, so a pick is asynchronous here in a way it never is otherwise.
  const [cropStep, setCropStep] = useState<CropStep | null>(null);
  const [isPreparingCrop, setIsPreparingCrop] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);

  // Free the blob URL when we leave the crop step or unmount (as UploadTab does
  // for its own source).
  useEffect(() => {
    if (!cropStep) return;
    return () => {
      URL.revokeObjectURL(cropStep.objectUrl);
    };
  }, [cropStep]);

  // Load an already-owned image's bytes from our own origin so the canvas that
  // crops them stays untainted: internal images come from the gallery's /file
  // route, the rare external reference from the remote-image proxy.
  const beginCrop = async (item: GalleryImageResponse) => {
    if (!galleryId) return;
    setCropError(null);
    setIsPreparingCrop(true);
    try {
      const { external, externalSrc } = item.image;
      const blob =
        external && externalSrc
          ? await fetchRemoteImage(externalSrc)
          : await fetchGalleryImageFile(galleryId, item.id);
      setCropStep({
        objectUrl: URL.createObjectURL(blob),
        name: item.name ?? "",
        altText: item.image.altText ?? "",
      });
    } catch (err: unknown) {
      setCropError(
        extractErrorMessage(err, "Could not load that image for cropping."),
      );
    } finally {
      setIsPreparingCrop(false);
    }
  };

  // Every gallery-tab pick funnels through here — footer Insert, tile
  // double-click, and keyboard activation alike.
  const handleGalleryPick = (item: GalleryImageResponse) => {
    if (!cropGalleryPicks) {
      onPick(item.image);
      return;
    }
    void beginCrop(item);
  };

  const insertSelected = () => {
    if (selected) handleGalleryPick(selected);
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
          onPick={handleGalleryPick}
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
    // The crop step replaces the tabs *and* the footer, so nothing outside it is
    // clickable — including the deselect-on-outside-click, which would otherwise
    // throw away the selection Back is meant to return to.
    <div
      className={styles.picker}
      onClick={cropStep ? undefined : handlePickerClick}>
      <ErrorBoundary
        boundaryName="gallery-picker"
        fallback={<ErrorFallback message="Something went wrong loading the image picker." />}
      >
        {cropStep ? (
          <div className={styles.cropStepFill}>
            <CropAndSaveStep
              objectUrl={cropStep.objectUrl}
              aspect={aspect}
              initialName={cropStep.name}
              initialAltText={cropStep.altText}
              galleryId={galleryId}
              onSaved={(image) => {
                setCropStep(null);
                onPick(image);
              }}
              onCancel={() => {
                setCropStep(null);
              }}
            />
          </div>
        ) : (
          <Tabs
            className={styles.pickerTabs}
            items={items}
            value={tab}
            onChange={(id) => {
              setTab(id as PickerTab);
              // The grid — and so the thing the actions act on — is gone once
              // the Upload tab is showing; don't leave them armed against it,
              // nor a failure report about an image that's no longer on screen.
              selection.clear();
              setCropError(null);
            }}
            ariaLabel='Image source'
          />
        )}
      </ErrorBoundary>
      {/* The crop editor carries its own Back / Use image actions. */}
      {!cropStep && (
        <>
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
                <Btn
                  variant='primary'
                  disabled={!selected}
                  isLoading={isPreparingCrop}
                  onClick={insertSelected}>
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
          {cropError && <p className={styles.error}>{cropError}</p>}
        </>
      )}
    </div>
  );
};

export { GalleryPicker };
