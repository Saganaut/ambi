// Small, unobtrusive cover-image control overlaid directly on the slide canvas.
// Collapsed it's just a faint thumbnail (or a placeholder when empty); on hover
// it brightens and reveals the placement options, so the cover image can be
// both chosen and positioned without leaving the canvas. This folds together
// what ImagePicker + ImagePlacementPicker do in the right sidebar and will
// eventually replace the EditSlidePanel ImagePicker — for now both coexist.
import { SlotMapping, slotButtons } from "@/features/deck/contexts/ImageSlot.types";
import { useImageSlot } from "@/features/deck/contexts/useImageSlot";
import { placementsEqual, returnImagePositonIcon } from "@/features/deck/utils/imageSlotUtil";
import { ImageTile } from "@/shared/components/Images/ImageTile";
import type { AppImage } from "@deck/store/deckApi.gen";
import { isImageEmpty, resolveImageUrl } from "@utils/image";
import styles from "./CoverImagePicker.module.css";

interface CoverImagePickerProps {
  image: AppImage | undefined;
  onPick: () => void;
  onClear: () => void;
  /** Commit a new placement for the existing cover image. */
  updateSlidePlacement: (placement: SlotMapping) => void;
}

const CoverImagePicker = ({
  image,
  onPick,
  onClear,
  updateSlidePlacement,
}: CoverImagePickerProps) => {
  // The placement preview/active state is driven by the same context the canvas
  // ImageSlots read, so hovering an option live-previews the move and the
  // current slot stays highlighted.
  const { imageConfig, setPreviewPlacement } = useImageSlot();
  const hasImage = !isImageEmpty(image);
  const thumbnailSrc = resolveImageUrl(image, "SM", "");

  return (
    <div className={styles.coverImagePicker}>
      <ImageTile onPick={onPick} onClear={onClear} imgUrl={thumbnailSrc ?? null} />

      {/* <div className={styles.thumbWrap}>
        <button
          type="button"
          className={styles.imageTile}
          onClick={onPick}
          aria-label="Pick cover image"
        >
          {hasImage && thumbnailSrc ? (
            <img src={thumbnailSrc} alt="" />
          ) : (
            <div className={styles.imageTileEmpty}>
              <PhotoIcon aria-hidden="true" />
            </div>
          )}
        </button>
        {hasImage && (
          <IconBtn
            fill="ghost"
            size="xs"
            className={styles.imageClear}
            icon={<XMarkIcon />}
            aria-label="Clear cover image"
            onClick={onClear}
          />
        )}
      </div> */}

      {/* Placement only matters once there's a cover image with a known slot. */}
      {hasImage && imageConfig != null && (
        // Clear the preview on leaving the whole grid, not each icon — moving
        // between icons stays inside the container so the preview hands off
        // straight from one slot to the next with no revert-to-saved flicker.
        <div className={styles.placementContainer} onMouseLeave={() => setPreviewPlacement(null)}>
          {slotButtons.map((button) => {
            const Icon = returnImagePositonIcon(button);
            const isActive = placementsEqual(imageConfig.slot.placement, button.placement);
            return (
              <div
                key={button.name}
                className={`${styles.iconWrapper} ${isActive ? styles.isActive : ""}`}
                onClick={() => updateSlidePlacement(button.placement)}
                onMouseEnter={() => setPreviewPlacement(button.placement)}
              >
                <Icon />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export { CoverImagePicker };
export type { CoverImagePickerProps };
