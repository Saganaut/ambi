/**
 * Write boundary for a deck's cover and background images. Each has a dedicated
 * backend endpoint ({@code PUT/DELETE /api/decks/{id}/cover-image} and
 * {@code .../background-image}), separate from the metadata PATCH, so an image
 * change never round-trips — or clobbers — the rest of the deck. The future
 * upload pipeline (multipart / presigned URL) slots onto the same routes.
 *
 * Write-only by design (see hook-roles.md): to *render* the current image, read
 * `deck.coverImage` / `deck.backgroundImage` from `useDeckQuery`. Cache behaviour
 * (optimistic patch of `getDeck` + response reconcile) lives in
 * `store/enhancements/deck.ts`, so these handlers stay thin and apply no matter
 * who fires the mutation. Mirrors the slide-side `setSlideImage` /
 * `clearSlideImage` role-param shape on `useSlide`.
 */
import {
  type AppImage,
  useSetDeckCoverImageMutation,
  useClearDeckCoverImageMutation,
  useSetDeckBackgroundImageMutation,
  useClearDeckBackgroundImageMutation,
} from "@deck/store/deckApi.gen";
import type { ImageRole } from "../Deck.types";

interface UseDeckImageMutateResult {
  /** Set the deck's cover or background image. */
  setDeckImage: (slot: ImageRole, image: AppImage) => void;
  /** Clear the deck's cover or background image. */
  clearDeckImage: (slot: ImageRole) => void;
}

const useDeckImageMutate = (deckId: string): UseDeckImageMutateResult => {
  const [setCover] = useSetDeckCoverImageMutation();
  const [clearCover] = useClearDeckCoverImageMutation();
  const [setBackground] = useSetDeckBackgroundImageMutation();
  const [clearBackground] = useClearDeckBackgroundImageMutation();

  const setDeckImage = (slot: ImageRole, image: AppImage) => {
    const mutate = slot === "cover" ? setCover : setBackground;
    void mutate({ id: deckId, setImageRequest: { image } });
  };

  const clearDeckImage = (slot: ImageRole) => {
    const mutate = slot === "cover" ? clearCover : clearBackground;
    void mutate({ id: deckId });
  };

  return { setDeckImage, clearDeckImage };
};

export { useDeckImageMutate };
export type { UseDeckImageMutateResult };
