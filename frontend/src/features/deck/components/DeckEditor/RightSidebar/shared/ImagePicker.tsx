// Presentational image-tile picker shared by the deck-editor right-sidebar
// panels. Extracted from ThemePanel (chunk 24) so the per-slide content image
// could move to EditSlidePanel while the deck background stays in ThemePanel —
// both render the identical 16:9 tile with a clear button. Stateless: the
// caller owns the Image record and the pick/clear handlers (typically wired to
// useGalleryPicker + a commit path).
import { IconBtn } from "@ui/Buttons/IconBtn";
import { XMarkIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { isImageEmpty, resolveImageUrl } from "@utils/image";
import type { AppImage } from "@deck/store/deckApi.gen";
import styles from "./ImagePicker.module.css";

interface ImagePickerProps {
  label: string;
  image: AppImage | undefined;
  seed?: string;
  onPick: () => void;
  onClear: () => void;
  placeholderText?: string;
  placeholderBackgroundImageUrl?: string;
}
//TODO: for production we replace random lorem picsum images with a standard image placeholder
const ImagePicker = ({
  label,
  image,
  seed = "random",
  onPick,
  onClear,
  placeholderText = "Choose image",
  placeholderBackgroundImageUrl
}: ImagePickerProps) => {
  const hasImage = !isImageEmpty(image);
  const thumbnailSrc = resolveImageUrl(image, "SM", seed, 200, 200, false);


  return (
    <div className={styles.imagePicker}>
      <span className={styles.imagePickerLabel}>{label}</span>
      <div className={styles.imageTileWrap}>
        <button
          type='button'
          className={styles.imageTile}
          onClick={onPick}
          aria-label={`Pick ${label.toLowerCase()}`}>
          {hasImage && thumbnailSrc ? (
            <img src={thumbnailSrc} alt='' />
          ) :
            <div className={styles.imageTileEmpty} style={{ '--emptyBackground': `url(${(placeholderBackgroundImageUrl)})` } as React.CSSProperties}>

              <div>
                <PhotoIcon aria-hidden='true' />
                <span>{placeholderText}</span>
              </div>
            </div>
          }
        </button>
        {hasImage && (
          <IconBtn
            fill='ghost'
            size='xs'
            className={styles.imageClear}
            icon={<XMarkIcon />}
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={onClear}
          />
        )}
      </div>
    </div>
  );
};


export { ImagePicker };
export type { ImagePickerProps };
