// The picker's single crop knob. One config replaces the old scatter of
// cropWidth / cropHeight / cropAspect / cropGalleryPicks props, so a call site
// says what its slot needs in one place and every tab honours it the same way:
//
//   off       no crop step anywhere — an upload stores the original, a gallery
//             pick is inserted as it stands.
//   optional  cropping is offered, never forced: the Gallery tab keeps Insert
//             and adds "Crop & insert", and the Upload tab's crop step carries a
//             "Use original" escape.
//   required  the slot's shape is load-bearing (square thumbnails, avatars), so
//             every pick passes through the crop editor with no way past it.
//
// The crop *target* is not part of this: it comes from the deck id the picker
// was opened with (see useGalleryPicker), because it is a property of the
// surface, not of the slot.

/** How the crop step takes part in a pick. */
type CropMode = "off" | "optional" | "required";

interface CropConfig {
  /** Defaults to "optional". */
  mode?: CropMode;
  /** Crop-box ratio (width / height), or "source" to keep the image's own. */
  aspect?: number | "source";
}

/** A {@link CropConfig} with every default filled in. */
interface ResolvedCropConfig {
  mode: CropMode;
  aspect: number | "source";
}

/** Used when a caller doesn't constrain the crop to a specific slot shape. */
const DEFAULT_CROP_ASPECT = 16 / 9;

const resolveCropConfig = (crop?: CropConfig): ResolvedCropConfig => ({
  mode: crop?.mode ?? "optional",
  aspect: crop?.aspect ?? DEFAULT_CROP_ASPECT,
});

export { DEFAULT_CROP_ASPECT, resolveCropConfig };
export type { CropConfig, CropMode, ResolvedCropConfig };
