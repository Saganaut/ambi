// View-model for the GalleryPicker's two-step image flow: which gallery tile is
// currently selected, and the contextual Insert/Delete actions that selection
// enables. Deleting is confirmed *inline* (a footer state, not a dialog) because
// the picker itself occupies the app's single global modal slot — opening a
// confirm dialog from here would evict the picker and close everything.
//
// The delete itself is the plain gallery mutation; the optimistic splice out of
// every materialized `listImages` page lives in `gallery/store/enhancements`,
// so the tile disappears from the grid with no refetch and no navigation.
import { useCallback, useState } from "react";
import {
  useRemoveImageMutation,
  type GalleryImageResponse,
} from "@features/gallery/store/galleryApi.gen";
import { extractErrorMessage } from "@utils/utils";

interface GalleryPickerSelection {
  /** The selected gallery image, or null when nothing is selected. */
  selected: GalleryImageResponse | null;
  /** True while the footer shows the inline "really delete?" confirmation. */
  isConfirmingDelete: boolean;
  isDeleting: boolean;
  deleteError: string | null;
  /** Select an image, or pass null to clear the selection. */
  select: (image: GalleryImageResponse | null) => void;
  /** Clear the selection (and any pending confirmation). */
  clear: () => void;
  /** Arm the inline confirmation. */
  requestDelete: () => void;
  /** Disarm the inline confirmation, keeping the selection. */
  cancelDelete: () => void;
  /** Delete the selected image and clear the selection on success. */
  confirmDelete: () => Promise<void>;
}

/**
 * Which tile is selected and whether its deletion is armed. The two are held in
 * one state object rather than two `useState`s because they always have to move
 * together: the grid stays live during a delete round-trip, so the resolution
 * has to decide "is the user still pointed at the image I deleted?" and answer
 * for both fields at once — two independent setters can't read each other's
 * pending value and would stomp a selection made mid-flight.
 */
interface SelectionState {
  image: GalleryImageResponse | null;
  isConfirmingDelete: boolean;
}

const NO_SELECTION: SelectionState = { image: null, isConfirmingDelete: false };

const useGalleryPickerSelection = (
  galleryId?: string,
): GalleryPickerSelection => {
  const [state, setState] = useState<SelectionState>(NO_SELECTION);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [removeImage, { isLoading: isDeleting }] = useRemoveImageMutation();
  const { image: selected, isConfirmingDelete } = state;

  // Any change of selection retires a pending confirmation and its error, so
  // the footer can never offer to delete an image the user has moved on from.
  const select = useCallback((image: GalleryImageResponse | null) => {
    setState({ image, isConfirmingDelete: false });
    setDeleteError(null);
  }, []);

  const clear = useCallback(() => {
    select(null);
  }, [select]);

  const requestDelete = useCallback(() => {
    setState((prev) =>
      prev.image ? { ...prev, isConfirmingDelete: true } : prev,
    );
    setDeleteError(null);
  }, []);

  const cancelDelete = useCallback(() => {
    setState((prev) => ({ ...prev, isConfirmingDelete: false }));
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!galleryId || !selected) return;
    const deletedId = selected.id;
    setDeleteError(null);
    try {
      await removeImage({ id: galleryId, imageId: deletedId }).unwrap();
      // Nothing disables the grid while the request is in flight, so by the
      // time it resolves the user may have selected — and even armed a delete
      // on — a different tile. Only retire the selection when it's still the
      // image that just went away.
      setState((prev) => (prev.image?.id === deletedId ? NO_SELECTION : prev));
    } catch (err: unknown) {
      // The confirmation stays armed on failure so the user can retry or
      // cancel, and the message stands even if they've moved on — the delete
      // really did fail and the tile really did come back.
      setDeleteError(extractErrorMessage(err, "Failed to delete image."));
    }
  }, [galleryId, selected, removeImage]);

  return {
    selected,
    isConfirmingDelete,
    isDeleting,
    deleteError,
    select,
    clear,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
};

export { useGalleryPickerSelection };
export type { GalleryPickerSelection };
