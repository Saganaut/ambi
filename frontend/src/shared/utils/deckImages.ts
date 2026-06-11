/**
 * Deck-image resolution helpers.
 *
 * Cover and background URLs cascade through several layers; this module is the
 * single place that defines the fallback chain. For now the chain is:
 *   element override (future) → deck value → Lorem Picsum placeholder seeded by id.
 *
 * Theme-driven backgrounds will slot in between "deck" and "Lorem Picsum" once
 * the interactiveSession passes the host's active theme through to clients.
 */
import { ImageSizeOptions } from "@/features/gallery/store/galleryEnums.gen";
import type { AppImage } from "@features/gallery/store/galleryApi.gen";
import { resolveImageUrl } from "@utils/image";

const COVER_WIDTH = 480;
const COVER_HEIGHT = 280;
const BG_WIDTH = 1600;
const BG_HEIGHT = 1000;

const picsumUrl = (seed: string, w: number, h: number): string =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

/** Returns the cover thumbnail URL for a deck, falling back to a deterministic Lorem Picsum. */
export const resolveDeckCover = (
  cover: AppImage | null | undefined,
  deckId: string | null | undefined,
): string => {
  const seed = `ambi-deck-cover-${deckId ?? "unknown"}`;
  // Cover cards sit at ~480×280, so SM (200px) is too small and MD (600px)
  // overshoots by a hair — MD gives a sharp 2x render on retina.
  const url = resolveImageUrl(cover, "MD", seed, COVER_WIDTH, COVER_HEIGHT, false);
  return url ?? picsumUrl(seed, COVER_WIDTH, COVER_HEIGHT);
};

/** Takes the background values of a deck and slide
 * If the slide has a background returns the slide, otherwise returns the deck
 * Optionally takes a size
 **/
export const resolveSlideBackground = (
  deckBackground?: AppImage,
  slideBackground?: AppImage,
  size?: ImageSizeOptions,
): string => {
  const imageSize = size ?? "LG";
  if (slideBackground != null) {
    return slideBackground.variants?.[imageSize] ?? "";
  }
  return deckBackground?.variants?.[imageSize] ?? "";
};
