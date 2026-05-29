// Presentational image-tile picker shared by the deck-editor right-sidebar
// panels. Extracted from ThemePanel (chunk 24) so the per-slide content image
// could move to EditSlidePanel while the deck background stays in ThemePanel —
// both render the identical 16:9 tile with a clear button. Stateless: the
// caller owns the Image record and the pick/clear handlers (typically wired to
// useGalleryPicker + a commit path).
import { IconBtn } from "@/components/Common/Buttons/IconBtn";
import { XMarkIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { isImageEmpty, resolveImageUrl } from "@/utils/image";
import type { Image } from "@/store/AmbiApi";
import styles from "./ImagePicker.module.css";

interface ImagePickerProps {
  label: string;
  image: Image | undefined;
  /** Stable seed for the placeholder thumbnail URL (usually element id + slot). */
  seed: string;
  onPick: () => void;
  onClear: () => void;
}

const ImagePicker = ({
  label,
  image,
  seed,
  onPick,
  onClear,
}: ImagePickerProps) => {
  const hasImage = !isImageEmpty(image);
  const thumbnailSrc = resolveImageUrl(image, "SM", seed, 200, 200, false);

  return (
    <div className={styles.imagePicker}>
      <span className={styles.imagePickerLabel}>{label}</span>
      <button
        type='button'
        className={styles.imageTile}
        onClick={onPick}
        aria-label={`Pick ${label.toLowerCase()}`}>
        {hasImage && thumbnailSrc ? (
          <img src={thumbnailSrc} alt='' />
        ) : (
          <span className={styles.imageTileEmpty}>
            <PhotoIcon aria-hidden='true' />
            <span>Choose image</span>
          </span>
        )}
        {hasImage && (
          <IconBtn
            fill='ghost'
            size='xs'
            className={styles.imageClear}
            icon={<XMarkIcon />}
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          />
        )}
      </button>
    </div>
  );
};

export { ImagePicker };
export type { ImagePickerProps };
