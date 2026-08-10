/**
 * Deck-image resolution helpers.
 *
 * Cover and background URLs cascade through several layers; this module is the
 * single place that defines the fallback chain. For now the chain is:
 *   element override (future) → deck value → first-party placeholder seeded by id.
 *
 * Theme-driven backgrounds will slot in between "deck" and the placeholder once
 * the interactiveSession passes the host's active theme through to clients.
 */
import { ImageSizeOptions } from "@/features/gallery/store/galleryEnums.gen";
import type { AppImage } from "@features/gallery/store/galleryApi.gen";
import { placeholderImageUrl, resolveImageUrl } from "@utils/image";

const COVER_WIDTH = 480;
const COVER_HEIGHT = 280;

/** Returns the cover thumbnail URL for a deck, falling back to a deterministic first-party placeholder. */
export const resolveDeckCover = (
  cover: AppImage | null | undefined,
  deckId: string | null | undefined,
): string => {
  const seed = `ambi-deck-cover-${deckId ?? "unknown"}`;
  // Cover cards sit at ~480×280, so SM (200px) is too small and MD (600px)
  // overshoots by a hair — MD gives a sharp 2x render on retina.
  const url = resolveImageUrl(cover, "MD", seed, COVER_WIDTH, COVER_HEIGHT, false);
  return url ?? placeholderImageUrl(seed, COVER_WIDTH, COVER_HEIGHT);
};

/** A background layer's URL at the requested tier, or "" when the image carries
 *  nothing — never a placeholder, since an absent background is a valid state. */
const backgroundUrl = (
  image: AppImage | null | undefined,
  size: ImageSizeOptions,
): string => resolveImageUrl(image, size, "", undefined, undefined, false) ?? "";

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
    return backgroundUrl(slideBackground, imageSize);
  }
  if (hideBackground) {
    return "";
  }
  return backgroundUrl(deckBackground, imageSize);
};

/**
 * Resolves the background COLOR for a slide through the same cascade as
 * {@link resolveSlideBackground}, but for the color layer:
 *   1. the slide's own `slideColor` wins outright;
 *   2. else, if `hideBackground` is set, the slide is explicitly background-less
 *      ("" — the inherited color is suppressed, just like the image);
 *   3. else the slide inherits the deck's `deckColor`.
 *
 * The color composes *behind* the image (it paints the canvas base layer), so
 * the two resolve independently; `hideBackground` is the one piece of shared
 * state — it suppresses the inherited image and color alike. Returns "" when no
 * color applies, so callers fall back to the canvas default.
 **/
export const resolveSlideBackgroundColor = (
  deckColor?: string,
  slideColor?: string,
  hideBackground?: boolean,
): string => {
  if (slideColor != null && slideColor !== "") {
    return slideColor;
  }
  if (hideBackground) {
    return "";
  }
  return deckColor ?? "";
};
