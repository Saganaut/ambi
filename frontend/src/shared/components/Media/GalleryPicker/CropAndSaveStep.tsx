// The picker's "frame it, name it, store it" step: an ImageCropEditor wired to
// the gallery upload mutation. Given a source blob URL it crops to the caller's
// aspect, uploads the result as a NEW gallery image, and hands the stored
// AppImage back — so the bytes a usage site embeds are always ones we own and
// always the shape that slot asked for.
//
// Two paths share it. The Upload tab brings its source in from a file or a
// pasted URL; the Gallery tab brings one in from an image the user already owns
// (see GalleryPicker's cropGalleryPicks). Neither owns the object URL — the
// parent creates it and revokes it when the step is left.
import { useState } from "react";
import {
  useUploadImageMutation,
  type AppImage,
} from "@features/gallery/store/galleryApi.gen";
import { getCroppedBlob, type PixelArea } from "@utils/imageEditing";
import { extractErrorMessage } from "@utils/utils";
import { ImageCropEditor } from "./ImageCropEditor";

interface CropAndSaveStepProps {
  /** Blob/object URL of the source image, owned (and revoked) by the parent. */
  objectUrl: string;
  /** Crop box aspect ratio ("source" = keep the image's own). */
  aspect: number | "source";
  /** Prefill for the name field (source filename, or the gallery item's name). */
  initialName?: string;
  /** Prefill for the alt-text field (the source image's own alt text). */
  initialAltText?: string;
  /** Gallery the cropped image is stored into; undefined until it resolves. */
  galleryId?: string;
  /** The newly stored image, once the upload succeeds. */
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
  galleryId,
  onSaved,
  onCancel,
}: CropAndSaveStepProps) => {
  const [uploadImage, { isLoading: isSaving }] = useUploadImageMutation();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (result: {
    area: PixelArea;
    name: string;
    altText: string;
  }) => {
    if (!galleryId) return;
    setError(null);
    try {
      const blob = await getCroppedBlob(objectUrl, result.area);
      const filename = `${result.name || "image"}.${extensionForType(blob.type)}`;
      const file = new File([blob], filename, { type: blob.type });
      const created = await uploadImage({
        id: galleryId,
        name: result.name || undefined,
        altText: result.altText || undefined,
        body: { file },
      }).unwrap();
      onSaved(created.image);
    } catch (err: unknown) {
      setError(
        extractErrorMessage(err, "Could not save the image. Please try again."),
      );
    }
  };

  return (
    <ImageCropEditor
      imageSrc={objectUrl}
      aspect={aspect}
      initialName={initialName}
      initialAltText={initialAltText}
      isSaving={isSaving}
      error={error}
      onCancel={onCancel}
      onConfirm={(result) => {
        void handleConfirm(result);
      }}
    />
  );
};

export { CropAndSaveStep };
