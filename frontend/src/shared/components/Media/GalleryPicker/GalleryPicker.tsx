// Modal body for choosing an image, with two tabs:
//   • Gallery — pick one of the user's stored images (GalleryTab).
//   • Upload  — bring in a new one by file or web URL, optionally crop it, name
//               it, and add alt text before it's stored (UploadTab).
// Either way the chosen image is handed to the caller via onPick(AppImage); the
// caller closes the modal. Every image the picker yields is a stored, S3-backed
// AppImage — pasted URLs are fetched + stored too, not kept as bare external
// references.
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
// are the paginated sub-resource (`GET /api/galleries/{id}/images`). One `crop`
// config (see cropConfig) says whether picks are cropped and at what shape, and
// `deckId` says where a crop lands: with a deck the cropped bytes are placement
// data in that deck's own namespace and mint no gallery entry, without one they
// become a gallery image as they always did.
import { useEffect, useRef, useState } from "react";
import { Btn } from "@saganaut/ambi-ui";
import { ErrorFallback } from "@ui/BoundaryFallbacks/ErrorFallback";
import { ErrorBoundary } from "@ui/ErrorBoundary/ErrorBoundary";
import { Tabs, type TabsItem } from "@ui/Tabs/Tabs";
import {
  useGetMyGalleryQuery,
  type AppImage,
  type GalleryImageResponse,
} from "@features/gallery/store/galleryApi.gen";
import { useAsyncAction } from "@hooks/useAsyncAction";
import {
  fetchGalleryImageFile,
  fetchRemoteImage,
  readCropProvenance,
  type CropSourceRef,
  type PixelArea,
} from "@utils/imageEditing";
import { isImageEmpty } from "@utils/image";
import { extractErrorMessage } from "@utils/utils";
import { CropAndSaveStep } from "./CropAndSaveStep";
import { resolveCropConfig, type CropConfig } from "./cropConfig";
import { GalleryTab } from "./GalleryTab";
import { UploadTab } from "./UploadTab";
import { useGalleryPickerSelection } from "./useGalleryPickerSelection";
import styles from "./GalleryPicker.module.css";

interface GalleryPickerProps {
  onPick: (image: AppImage) => void;
  onClose: () => void;
  /**
   * The image the slot already holds. Prefills the Upload tab's paste-URL field
   * (and opens that tab first) for an external reference, and — when it records
   * where it was cropped from — unlocks re-cropping on the original.
   */
  current?: AppImage;
  /** Deck that owns crops made here; without it a crop lands in the gallery. */
  deckId?: string;
  /** Whether (and how) picks are cropped; defaults to an optional 16:9 crop. */
  crop?: CropConfig;
}

type PickerTab = "gallery" | "upload";

/** An image on its way through the crop editor, with the prefills it carries. */
interface CropStep {
  /** Object URL of the fetched source bytes; revoked when the step is left. */
  objectUrl: string;
  name: string;
  altText: string;
  /** The gallery image the bytes came from, stamped as the crop's provenance. */
  source?: CropSourceRef;
  /** Handed back untouched when the author keeps the original. */
  original?: AppImage;
  /** The rect a previous crop used, when that crop is being adjusted. */
  initialArea?: PixelArea;
}

const GalleryPicker = ({
  onPick,
  onClose,
  current,
  deckId,
  crop,
}: GalleryPickerProps) => {
  const { data: gallery, isError: galleryError } = useGetMyGalleryQuery();
  const galleryId = gallery?.id;
  const cropConfig = resolveCropConfig(crop);
  const initialUrl = current?.external ? current.externalSrc : undefined;
  const [tab, setTab] = useState<PickerTab>(initialUrl ? "upload" : "gallery");
  const selection = useGalleryPickerSelection(galleryId);
  const { selected } = selection;
  const selectedName = selected?.name ?? "this image";

  // The crop step. Its source bytes are fetched on demand, so entering it is
  // asynchronous in a way inserting an image never is.
  const [cropStep, setCropStep] = useState<CropStep | null>(null);

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
  // route, the rare external reference from the remote-image proxy. Guarded
  // against re-entry — Insert and the tile's double-click both land here, and a
  // second fetch mid-flight would leak the object URL the first one made.
  const [
    beginCrop,
    { isRunning: isPreparingCrop, error: cropError, reset: clearCropError },
  ] = useAsyncAction(async (item: GalleryImageResponse) => {
    if (!galleryId) return;
    const { external, externalSrc } = item.image;
    const blob =
      external && externalSrc
        ? await fetchRemoteImage(externalSrc)
        : await fetchGalleryImageFile(galleryId, item.id);
    setCropStep({
      objectUrl: URL.createObjectURL(blob),
      name: item.name ?? "",
      altText: item.image.altText ?? "",
      source: { galleryId, imageId: item.id },
      original: item.image,
    });
  });

  // Re-crop: a placement records the gallery image it was cut from, so widening
  // the frame reopens the *original* rather than compounding a crop of a crop.
  // Only offered when those bytes are still reachable — a deck-scoped object has
  // no same-origin read of its own, so a lost source hides the affordance rather
  // than cropping already-cropped pixels.
  const provenance = readCropProvenance(current);
  const currentExternalSrc =
    current && !isImageEmpty(current) && current.external
      ? current.externalSrc
      : undefined;
  const canAdjustCrop =
    cropConfig.mode !== "off" && Boolean(provenance ?? currentExternalSrc);

  const [
    beginAdjustCrop,
    { isRunning: isPreparingAdjust, error: adjustError },
  ] = useAsyncAction(async () => {
    if (!current) return;
    let blob: Blob;
    if (provenance) {
      blob = await fetchGalleryImageFile(provenance.galleryId, provenance.imageId);
    } else if (currentExternalSrc) {
      blob = await fetchRemoteImage(currentExternalSrc);
    } else {
      return;
    }
    setCropStep({
      objectUrl: URL.createObjectURL(blob),
      name: "",
      altText: current.altText ?? "",
      source: provenance ?? undefined,
      original: current,
      initialArea: provenance ?? undefined,
    });
  });

  const failure = cropError ?? adjustError;
  const cropErrorMessage = failure
    ? extractErrorMessage(failure, "Could not load that image for cropping.")
    : null;

  // Every gallery-tab insertion funnels through here — footer Insert, tile
  // double-click, and keyboard activation alike. Only a required crop
  // intercepts it; where cropping is merely offered, Insert still means "this
  // image, as it is" and the framing lives on its own button.
  const handleGalleryPick = (item: GalleryImageResponse) => {
    if (cropConfig.mode !== "required") {
      onPick(item.image);
      return;
    }
    void beginCrop(item);
  };

  const insertSelected = () => {
    if (selected) handleGalleryPick(selected);
  };

  const cropSelected = () => {
    if (selected) void beginCrop(selected);
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

  // Hoisted so the crop step's callbacks close over narrowed consts rather than
  // re-reading a nullable field.
  const cropSource = cropStep?.source;
  const cropOriginal = cropStep?.original;

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
          deckId={deckId}
          crop={cropConfig}
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
              aspect={cropConfig.aspect}
              initialName={cropStep.name}
              initialAltText={cropStep.altText}
              initialArea={cropStep.initialArea}
              galleryId={galleryId}
              deckId={deckId}
              prepareSource={cropSource ? async () => cropSource : undefined}
              resolveOriginal={
                cropConfig.mode === "optional" && cropOriginal
                  ? async () => cropOriginal
                  : undefined
              }
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
              clearCropError();
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
                  variant='brand'
                  isDisabled={!selected}
                  isLoading={cropConfig.mode === "required" && isPreparingCrop}
                  onClick={insertSelected}>
                  Insert
                </Btn>
                {cropConfig.mode === "optional" && (
                  <Btn
                    variant='secondary'
                    isDisabled={!selected}
                    isLoading={isPreparingCrop}
                    onClick={cropSelected}>
                    Crop &amp; insert
                  </Btn>
                )}
                {canAdjustCrop && (
                  <Btn
                    variant='secondary'
                    isLoading={isPreparingAdjust}
                    onClick={() => {
                      void beginAdjustCrop();
                    }}>
                    Adjust crop
                  </Btn>
                )}
                <Btn
                  variant='error'
                  isDisabled={!selected}
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
          {cropErrorMessage && (
            <p className={styles.error}>{cropErrorMessage}</p>
          )}
        </>
      )}
    </div>
  );
};

export { GalleryPicker };
