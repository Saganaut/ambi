// Opens the AvatarPicker in the global modal and hands the chosen pick to a
// per-call handler. Mirrors useGalleryPicker: the modal closes itself after a
// pick, while the caller owns the write — the account page PATCHes
// /api/users/me, and a future participant/lobby picker would target its own
// endpoint with the same surface.
import { useCallback } from "react";
import {
  AvatarPicker,
  type AvatarPick,
} from "@components/Media/AvatarPicker/AvatarPicker";
import { useModal } from "@hooks/useModal";

type AvatarPickHandler = (pick: AvatarPick) => void;

interface OpenAvatarPickerOptions {
  /** Modal title; defaults to "Choose an avatar". */
  title?: string;
  /** Currently selected built-in id; preselects that tile. */
  builtinValue?: string;
}

type OpenAvatarPicker = (
  onPick: AvatarPickHandler,
  options?: OpenAvatarPickerOptions,
) => void;

const useAvatarPicker = (): OpenAvatarPicker => {
  const { openModal, closeModal } = useModal();

  return useCallback(
    (onPick, options) => {
      openModal({
        title: options?.title ?? "Choose an avatar",
        content: (
          <AvatarPicker
            builtinValue={options?.builtinValue}
            onPick={(pick) => {
              onPick(pick);
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

export { useAvatarPicker };
export type { OpenAvatarPicker, OpenAvatarPickerOptions };
