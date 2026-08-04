// The picker's "frame it, name it, store it" step: an ImageCropEditor wired to
// whichever ingest owns the result.
//
// A crop is placement data, not a library item, so when the picker was opened
// with a deck it goes to that deck's own namespace
// (`POST /api/decks/{deckId}/images/upload`) and mints no GalleryImage —
// ten options cropped from one gallery image leave one gallery entry, not
// eleven. Surfaces with no deck to scope to (theme editor, avatar picker) keep
// the old gallery target; giving those aggregates a scoped namespace means
// first giving them an adoption lifecycle.
//
// Three collaborators share it. The Upload tab brings its source in from a file
// or a pasted URL, the Gallery tab from an image the user already owns, and the
// re-crop path from the source a placement records in its provenance. None owns
// the object URL — the parent creates it and revokes it when the step is left.
import {
  useUploadImageMutation,
  type AppImage,
} from "@features/gallery/store/galleryApi.gen";
import { useUploadDeckImageMutation } from "@features/deck/store/deckApi.gen";
import { useAsyncAction } from "@hooks/useAsyncAction";
import {
  getCroppedBlob,
  withCropProvenance,
  type CropSourceRef,
  type PixelArea,
} from "@utils/imageEditing";
import { extractErrorMessage } from "@utils/utils";
import { ImageCropEditor } from "./ImageCropEditor";

/** What the details fields hold when an action is fired. */
interface CropDetails {
  name: string;
  altText: string;
}

interface CropAndSaveStepProps {
  /** Blob/object URL of the source image, owned (and revoked) by the parent. */
  objectUrl: string;
  /** Crop box aspect ratio ("source" = keep the image's own). */
  aspect: number | "source";
  /** Prefill for the name field (source filename, or the gallery item's name). */
  initialName?: string;
  /** Prefill for the alt-text field (the source image's own alt text). */
  initialAltText?: string;
  /** Rect to reopen on, when a previous crop is being adjusted. */
  initialArea?: PixelArea;
  /** Gallery the crop falls back to when there is no deck to scope it to. */
  galleryId?: string;
  /** Deck that owns the cropped bytes — the placement-only target. */
  deckId?: string;
  /**
   * Runs before the crop is uploaded and yields the gallery image it derives
   * from, for provenance. The Upload tab stores the *uncropped* original here,
   * so the gallery keeps the genuinely new image and a failure stops the flow
   * without losing the author's framing; the Gallery tab just names the image
   * that was picked.
   */
  prepareSource?: (details: CropDetails) => Promise<CropSourceRef | null>;
  /** Supplied when the crop is optional: yields the image to embed uncropped. */
  resolveOriginal?: (details: CropDetails) => Promise<AppImage>;
  /** The image to embed, once it is stored. */
  onSaved: (image: AppImage) => void;
  onCancel: () => void;
}

// getCroppedBlob emits WebP (or PNG fallback); name the File to match so the
// backend sees a content type in its allow-list.
const extensionForType = (type: string): string =>
  type === "image/png" ? "png" : "webp";

const CropAndSaveStep = ({
  objectUrl,
  aspect,
  initialName,
  initialAltText,
  initialArea,
  galleryId,
  deckId,
  prepareSource,
  resolveOriginal,
  onSaved,
  onCancel,
}: CropAndSaveStepProps) => {
  const [uploadImage, { isLoading: isUploading }] = useUploadImageMutation();
  const [uploadDeckImage, { isLoading: isUploadingToDeck }] =
    useUploadDeckImageMutation();

  // Cropping alone takes seconds on a large source, so the guard — and the
  // button's busy state — has to span the encode as well as the upload:
  // otherwise a second click during the encode stores the image twice.
  const [saveCrop, { isRunning, error }] = useAsyncAction(
    async (result: { area: PixelArea } & CropDetails) => {
      const details = { name: result.name, altText: result.altText };
      const source = prepareSource ? await prepareSource(details) : null;
      const blob = await getCroppedBlob(objectUrl, result.area);
      const filename = `${result.name || "image"}.${extensionForType(blob.type)}`;
      const file = new File([blob], filename, { type: blob.type });
      let stored: AppImage;
      if (deckId) {
        stored = await uploadDeckImage({
          id: deckId,
          altText: result.altText || undefined,
          body: { file },
        }).unwrap();
      } else {
        if (!galleryId) return;
        const created = await uploadImage({
          id: galleryId,
          name: result.name || undefined,
          altText: result.altText || undefined,
          body: { file },
        }).unwrap();
        stored = created.image;
      }
      onSaved(source ? withCropProvenance(stored, source, result.area) : stored);
    },
  );

  const [skipCrop, { isRunning: isSkipping, error: skipError }] = useAsyncAction(
    async (details: CropDetails) => {
      if (!resolveOriginal) return;
      onSaved(await resolveOriginal(details));
    },
  );

  const isBusy = isRunning || isSkipping || isUploading || isUploadingToDeck;
  const failure = error ?? skipError;

  return (
    <ImageCropEditor
      imageSrc={objectUrl}
      aspect={aspect}
      initialName={initialName}
      initialAltText={initialAltText}
      initialArea={initialArea}
      isSaving={isBusy}
      error={
        failure
          ? extractErrorMessage(
              failure,
              "Could not save the image. Please try again.",
            )
          : null
      }
      onCancel={onCancel}
      onConfirm={(result) => {
        void saveCrop(result);
      }}
      onUseOriginal={
        resolveOriginal
          ? (details) => {
              void skipCrop(details);
            }
          : undefined
      }
    />
  );
};

export { CropAndSaveStep };
export type { CropDetails };
