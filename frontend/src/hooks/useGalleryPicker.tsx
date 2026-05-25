// Opens the GalleryPicker in the global modal with a caller-supplied pick
// handler. The picker hands back a fully-populated `Image` (the unified
// wire shape) — internal type, gallery id, and the picker's already-fresh
// presigned URL all in one value. Callers drop it directly into whatever
// slot they're editing:
//
//     const openPicker = useGalleryPicker();
//     openPicker((image) => {
//       commitOption({ ...option, image });
//     });
//
// Callers that also support pasting an external URL can pass `initialUrl`
// so the picker's URL input pre-populates with whatever the slot currently
// references; the same onPick handles both gallery picks and URL submits.
//
// The backend strips `imgUrl` on write for internal images and rehydrates
// it on read, so there's no field-by-field merge dance for callers.
//
// The picker self-closes after onPick is invoked.
import { useCallback } from "react";
import { GalleryPicker } from "@/components/Common/GalleryPicker/GalleryPicker";
import type { Image } from "@/store/BrainFlexApi";
import { usePickerModal } from "./usePickerModal";

type PickHandler = (image: Image) => void;

interface OpenPickerOptions {
  initialUrl?: string;
}

const useGalleryPicker = (): ((
  onPick: PickHandler,
  options?: OpenPickerOptions,
) => void) => {
  const openPicker = usePickerModal();

  return useCallback(
    (onPick: PickHandler, options?: OpenPickerOptions) => {
      openPicker({
        title: "Choose an image",
        content: (autoClose) => (
          <GalleryPicker
            initialUrl={options?.initialUrl}
            onPick={(image) => {
              onPick(image);
              autoClose();
            }}
            onClose={autoClose}
          />
        ),
      });
    },
    [openPicker],
  );
};

export { useGalleryPicker };
