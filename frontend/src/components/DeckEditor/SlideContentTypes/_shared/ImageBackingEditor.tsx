// Image picker shared by Grid / Drawing / PlaceOnImage. Left side shows the
// preview thumbnail (16:9), right side stacks URL input + Gallery button.
// Hands callers the resolved Image; URL paste yields an external Image,
// gallery picks land an internal Image with variants.
//
// The component is intentionally controlled: it doesn't own the URL state
// so a slide editor can debounce the typed URL through its existing
// `schedule`/`flush` pipeline without rerouting.
import { Btn } from "@/components/Common/Buttons/Btn";
import { Input } from "@/components/Common/Input/Input/Input";
import { useGalleryPicker } from "@/hooks/useGalleryPicker";
import { externalImage } from "@/utils/image";
import type { Image } from "@/store/BrainFlexApi";
import styles from "./_shared.module.css";

interface ImageBackingEditorProps {
  idBase: string;
  /** Resolved preview URL — pass through `displayUrl` / `resolveImageUrl`. */
  previewUrl: string;
  /** Paste-URL value (external images only; gallery picks leave this empty). */
  pasteUrl: string;
  urlLabel?: string;
  urlPlaceholder?: string;
  emptyPlaceholderAlt?: string;
  /** Called when the author edits the URL field. Pass the resolved Image. */
  onUrlChange: (next: string, image: Image | undefined) => void;
  /** Called after a successful gallery pick. */
  onGalleryPick: (image: Image) => void;
  /** Fires before opening the gallery so the parent can flush pending writes. */
  onBeforePick?: () => void;
  onUrlBlur?: () => void;
}

const ImageBackingEditor = ({
  idBase,
  previewUrl,
  pasteUrl,
  urlLabel = "Image URL",
  urlPlaceholder = "https://…",
  emptyPlaceholderAlt = "No image",
  onUrlChange,
  onGalleryPick,
  onBeforePick,
  onUrlBlur,
}: ImageBackingEditorProps) => {
  const openPicker = useGalleryPicker();

  return (
    <div className={styles.imageEditor}>
      <div
        className={[
          styles.imagePreview,
          previewUrl ? "" : styles.imagePreviewEmpty,
        ]
          .filter(Boolean)
          .join(" ")}>
        {previewUrl ? (
          <img src={previewUrl} alt='' />
        ) : (
          <span>{emptyPlaceholderAlt}</span>
        )}
      </div>
      <div className={styles.imageEditorFields}>
        <div className={styles.urlPickerRow}>
          <div className={styles.urlPickerInput}>
            <Input
              label={urlLabel}
              id={`img-url-${idBase}`}
              type='text'
              fullWidth
              value={pasteUrl}
              placeholder={urlPlaceholder}
              onChange={(e) => {
                const next = e.target.value;
                onUrlChange(next, next ? externalImage(next) : undefined);
              }}
              onBlur={onUrlBlur}
            />
          </div>
          <Btn
            size='sm'
            onClick={() => {
              onBeforePick?.();
              openPicker((image) => {
                onGalleryPick(image);
              });
            }}>
            Gallery
          </Btn>
        </div>
      </div>
    </div>
  );
};

export { ImageBackingEditor };
