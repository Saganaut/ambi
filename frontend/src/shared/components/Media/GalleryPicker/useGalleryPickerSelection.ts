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

const useGalleryPickerSelection = (
  galleryId?: string,
): GalleryPickerSelection => {
  const [selected, setSelected] = useState<GalleryImageResponse | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [removeImage, { isLoading: isDeleting }] = useRemoveImageMutation();

  // Any change of selection retires a pending confirmation and its error, so
  // the footer can never offer to delete an image the user has moved on from.
  const select = useCallback((image: GalleryImageResponse | null) => {
    setSelected(image);
    setIsConfirmingDelete(false);
    setDeleteError(null);
  }, []);

  const clear = useCallback(() => {
    select(null);
  }, [select]);

  const requestDelete = useCallback(() => {
    setIsConfirmingDelete(true);
    setDeleteError(null);
  }, []);

  const cancelDelete = useCallback(() => {
    setIsConfirmingDelete(false);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!galleryId || !selected) return;
    setDeleteError(null);
    try {
      await removeImage({ id: galleryId, imageId: selected.id }).unwrap();
      setSelected(null);
      setIsConfirmingDelete(false);
    } catch (err: unknown) {
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
