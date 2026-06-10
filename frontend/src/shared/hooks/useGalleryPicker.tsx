// Opens the GalleryPicker in the global modal and hands the chosen AppImage to
// a per-call handler. The deck-editor image slots (deck/slide cover &
// background, MCQ option images) all share this hook so the modal wiring lives
// in one place; the handler is per-call because callers close over the record
// they're writing into (e.g. a specific MCQ option). The modal closes itself
// after a pick — GalleryPicker's contract leaves closing to the caller.
//
// Note: ThemeEditor renders GalleryPicker inline instead, because it already
// lives inside the global modal (ModalProvider hosts one dialog at a time).
import { useCallback } from "react";
import { GalleryPicker } from "@components/Media/GalleryPicker/GalleryPicker";
import { useModal } from "@hooks/useModal";
import type { AppImage } from "@features/gallery/store/galleryApi.gen";

type PickHandler = (image: AppImage) => void;

interface OpenPickerOptions {
  /** Modal title; defaults to "Choose an image". */
  title?: string;
  /** Prefills the Upload tab's paste-URL field (and opens that tab first). */
  initialUrl?: string;
  /** Target slot shape — constrains the Upload tab's crop aspect (default 16:9). */
  cropWidth?: number;
  cropHeight?: number;
}

type OpenGalleryPicker = (
  onPick: PickHandler,
  options?: OpenPickerOptions,
) => void;

const useGalleryPicker = (): OpenGalleryPicker => {
  const { openModal, closeModal } = useModal();

  return useCallback(
    (onPick, options) => {
      openModal({
        title: options?.title ?? "Choose an image",
        content: (
          <GalleryPicker
            initialUrl={options?.initialUrl}
            cropWidth={options?.cropWidth}
            cropHeight={options?.cropHeight}
            onPick={(image) => {
              onPick(image);
              closeModal();
            }}
            onClose={closeModal}
          />
        ),
      });
    },
    [openModal, closeModal],
  );
};

export { useGalleryPicker };
export type { OpenGalleryPicker, OpenPickerOptions };
