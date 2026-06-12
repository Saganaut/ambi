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

/**
 * Resolves the background URL for a slide through its three-state cascade:
 *   1. the slide's own `slideBackground` image wins outright;
 *   2. else, if `hideBackground` is set, the slide is explicitly background-less
 *      ("" — the deck default is suppressed);
 *   3. else the slide inherits the deck's `deckBackground`.
 *
 * Steps 2 and 3 are why a bare null can't carry the intent alone: null only says
 * "no own image", and `hideBackground` disambiguates suppress-vs-inherit.
 * Optionally takes a variant size (defaults to LG).
 **/
export const resolveSlideBackground = (
  deckBackground?: AppImage,
  slideBackground?: AppImage,
  size?: ImageSizeOptions,
  hideBackground?: boolean,
): string => {
  const imageSize = size ?? "LG";
  if (slideBackground != null) {
    return slideBackground.variants?.[imageSize] ?? "";
  }
  if (hideBackground) {
    return "";
  }
  return deckBackground?.variants?.[imageSize] ?? "";
};
