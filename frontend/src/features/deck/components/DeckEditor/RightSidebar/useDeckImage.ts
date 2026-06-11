/**
 * Read/write boundary for a deck's cover and background images. These have a
 * dedicated home on the backend ({@code PUT/DELETE /api/decks/{id}/cover-image}
 * and {@code .../background-image}), separate from the metadata PATCH, so an
 * image change never round-trips — or clobbers — the rest of the deck. The
 * future upload pipeline (multipart / presigned URL) slots onto the same
 * routes.
 *
 * Cache behaviour (optimistic patch of `getDeck` + tag-driven reconciling
 * refetch) lives in `store/enhancements/deck.ts`, so it applies no matter who
 * fires the mutation; the handlers here are thin. Mirrors `useDeckSettings`'s
 * shape — the deck-editor right-sidebar panels call this instead of folding
 * images into `updateDeck`.
 */
import { getRouteApi } from "@tanstack/react-router";
import { useGetDeckQuery, useSetDeckCoverImageMutation, useClearDeckCoverImageMutation, useSetDeckBackgroundImageMutation, useClearDeckBackgroundImageMutation, type AppImage } from "@deck/store/deckApi.gen";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

interface UseDeckImageResult {
  /** The deck's current cover image from the getDeck cache, if any. */
  coverImage: AppImage | undefined;
  /** The deck's current background image from the getDeck cache, if any. */
  backgroundImage: AppImage | undefined;
  /** Set the deck's cover image. */
  setCoverImage: (image: AppImage) => void;
  /** Clear the deck's cover image. */
  clearCoverImage: () => void;
  /** Set the deck's background image. */
  setBackgroundImage: (image: AppImage) => void;
  /** Clear the deck's background image. */
  clearBackgroundImage: () => void;
}

const useDeckImage = (): UseDeckImageResult => {
  const { deckId } = routeApi.useParams();
  const { data: deck } = useGetDeckQuery({ id: deckId });
  const [setCover] = useSetDeckCoverImageMutation();
  const [clearCover] = useClearDeckCoverImageMutation();
  const [setBackground] = useSetDeckBackgroundImageMutation();
  const [clearBackground] = useClearDeckBackgroundImageMutation();

  return {
    coverImage: deck?.coverImage,
    backgroundImage: deck?.backgroundImage,
    setCoverImage: (image) => {
      void setCover({ id: deckId, setImageRequest: { image } });
    },
    clearCoverImage: () => {
      void clearCover({ id: deckId });
    },
    setBackgroundImage: (image) => {
      void setBackground({ id: deckId, setImageRequest: { image } });
    },
    clearBackgroundImage: () => {
      void clearBackground({ id: deckId });
    },
  };
};

export { useDeckImage };
export type { UseDeckImageResult };
