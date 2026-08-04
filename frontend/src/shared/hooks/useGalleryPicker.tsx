// Opens the GalleryPicker in the global modal and hands the chosen AppImage to
// a per-call handler. The deck-editor image slots (deck/slide cover &
// background, MCQ option images) all share this hook so the modal wiring lives
// in one place; the handler is per-call because callers close over the record
// they're writing into (e.g. a specific MCQ option). The modal closes itself
// after a pick — GalleryPicker's contract leaves closing to the caller.
//
// The deck id is bound once, here, rather than per call: it says where a *crop*
// is stored (the deck's own namespace, minting no gallery entry) and that is a
// property of the surface the picker was opened from, not of the slot being
// filled. It also travels with the opener wherever it is passed down, so a
// shared row component doesn't need the deck drilled in beside it. Surfaces with
// no deck — the theme editor, the account gallery — pass nothing and their crops
// keep landing in the gallery.
//
// Note: ThemeEditor renders GalleryPicker inline instead, because it already
// lives inside the global modal (ModalProvider hosts one dialog at a time).
import { useCallback } from "react";
import { GalleryPicker } from "@components/Media/GalleryPicker/GalleryPicker";
import type { CropConfig } from "@components/Media/GalleryPicker/cropConfig";
import { useModal } from "@hooks/useModal";
import type { AppImage } from "@features/gallery/store/galleryApi.gen";

type PickHandler = (image: AppImage) => void;

interface OpenPickerOptions {
  /** Modal title; defaults to "Choose an image". */
  title?: string;
  /**
   * The image the slot already holds. Prefills the Upload tab's paste-URL field
   * for an external reference, and unlocks re-cropping when the image records
   * where it was cropped from.
   */
  current?: AppImage;
  /**
   * Whether (and at what shape) a pick is cropped — one knob, three settings:
   * "off", "optional" (the default: offered, skippable) and "required" for slots
   * whose shape is load-bearing. See cropConfig.
   */
  crop?: CropConfig;
}

type OpenGalleryPicker = (
  onPick: PickHandler,
  options?: OpenPickerOptions,
) => void;

/**
 * @param deckId deck that owns crops made through this opener; omit on surfaces
 *   with no deck, whose crops become gallery images as they always did.
 */
const useGalleryPicker = (deckId?: string): OpenGalleryPicker => {
  const { openModal, closeModal } = useModal();

  return useCallback(
    (onPick, options) => {
      openModal({
        title: options?.title ?? "Choose an image",
        content: (
          <GalleryPicker
            current={options?.current}
            crop={options?.crop}
            deckId={deckId}
            onPick={(image) => {
              onPick(image);
              closeModal();
            }}
            onClose={closeModal}
          />
        ),
      });
    },
    [openModal, closeModal, deckId],
  );
};

export { useGalleryPicker };
export type { OpenGalleryPicker, OpenPickerOptions };
