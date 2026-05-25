// Shared shape for picker hooks (useMediaPicker, useGalleryPicker): given a
// title + content factory that receives an autoClose callback, open the global
// modal and let the caller's onPick run before self-closing. Keeps every
// picker hook a single `openPicker(...)` call instead of duplicated openModal
// wiring.
import { type ReactNode, useCallback } from "react";
import { useModal } from "@/context/useModal";

interface PickerModalArgs {
  title: string;
  content: (autoClose: () => void) => ReactNode;
}

const usePickerModal = (): ((args: PickerModalArgs) => void) => {
  const { openModal, closeModal } = useModal();

  return useCallback(
    ({ title, content }: PickerModalArgs) => {
      openModal({ title, content: content(closeModal) });
    },
    [openModal, closeModal],
  );
};

export { usePickerModal };
