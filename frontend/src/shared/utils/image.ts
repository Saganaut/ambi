/**
 * Helpers around the wire `Image` shape.
 *
 * The backend models every image-bearing field with the same record:
 *   { useExternalImg, internalImgId, externalUrl, variants: { XS, SM, MD, LG, XL } }
 * — see `model/element/Image.java`. `useExternalImg` decides the source of
 * truth: external (author pasted a URL) holds that URL in `externalUrl` and
 * leaves `variants` empty; internal (gallery-backed) holds the gallery id in
 * `internalImgId` and the backend rehydrates the variants map (one entry per
 * `ImageSize` tier: XS/SM/MD/LG/XL) from S3 on every read.
 *
 * The constructors below produce the standard "blank / external / internal"
 * shapes so callers don't reach into the object literal. `resolveImageUrl`
 * is the single place renderers go to turn an `Image | undefined` into an
 * actual <img src=…> value at a specific tier, falling back to a seeded
 * Lorem Picsum placeholder.
 */
import type { Image, ImageVariant } from "@store/AmbiApi";

export type ImageSize = "XS" | "SM" | "MD" | "LG" | "XL";

const PLACEHOLDER_W = 640;
const PLACEHOLDER_H = 360;

/** Walk-up order when the requested size is missing — prefer the next-larger
 *  rendition over the next-smaller one so we don't blur a thumbnail to fit
 *  a hero slot. Tier indexes: xs=0, sm=1, md=2, lg=3, xl=4. */
const SIZE_ORDER: ImageSize[] = ["XS", "SM", "MD", "LG", "XL"];

export const externalImage = (url: string): Image => ({
  useExternalImg: true,
  internalImgId: "",
  externalUrl: url,
  variants: {},
});

export const internalImage = (galleryImageId: string): Image => ({
  useExternalImg: false,
  internalImgId: galleryImageId,
  variants: {},
});

export const emptyImage = (): Image => ({
  useExternalImg: true,
  internalImgId: "",
  variants: {},
});

const hasRenderableUrl = (v: ImageVariant | undefined): v is ImageVariant =>
  !!v && typeof v.url === "string" && v.url.trim() !== "";

export const isImageEmpty = (img: Image | null | undefined): boolean => {
  if (!img) return true;
  if (img.useExternalImg) {
    return !img.externalUrl || img.externalUrl.trim() === "";
  }
  if (!img.variants) return true;
  return !Object.values(img.variants).some(hasRenderableUrl);
};

/** Largest variant we have a URL for, or `undefined` if the image is empty.
 *  External images don't carry tiered variants — callers should check
 *  `useExternalImg`/`externalUrl` directly when they need the raw URL. */
export const largestVariant = (
  img: Image | null | undefined,
): ImageVariant | undefined => {
  const variants = img?.variants;
  if (!variants) return undefined;
  for (let i = SIZE_ORDER.length - 1; i >= 0; i--) {
    const hit = variants[SIZE_ORDER[i]];
    if (hasRenderableUrl(hit)) return hit;
  }
  return undefined;
};

/** Pick the variant for the requested size, or the next-largest available
 *  (then smaller sizes as last resort). Returns undefined for external
 *  images and for empty internal images. */
export const variantFor = (
  img: Image | null | undefined,
  preferred: ImageSize,
): ImageVariant | undefined => {
  const variants = img?.variants;
  if (!variants) return undefined;
  const startIdx = SIZE_ORDER.indexOf(preferred);
  if (startIdx < 0) return largestVariant(img);
  for (let i = startIdx; i < SIZE_ORDER.length; i++) {
    const hit = variants[SIZE_ORDER[i]];
    if (hasRenderableUrl(hit)) return hit;
  }
  for (let i = startIdx - 1; i >= 0; i--) {
    const hit = variants[SIZE_ORDER[i]];
    if (hasRenderableUrl(hit)) return hit;
  }
  return undefined;
};

/** Seeded Lorem Picsum placeholder used when an image slot is empty. */
export const placeholderImageUrl = (
  seed: string,
  w: number = PLACEHOLDER_W,
  h: number = PLACEHOLDER_H,
): string => `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

/**
 * Resolve an `Image | undefined` to a renderable URL at the requested size.
 * Falls back to a Lorem Picsum placeholder seeded on `seed` (typically the
 * parent element/option id) when `includePlaceholder` is true.
 */
export const resolveImageUrl = (
  img: Image | null | undefined,
  preferred: ImageSize,
  seed: string,
  w?: number,
  h?: number,
  includePlaceholder = false,
): string | null => {
  if (img?.useExternalImg) {
    if (img.externalUrl && img.externalUrl.trim() !== "")
      return img.externalUrl;
    return includePlaceholder ? placeholderImageUrl(seed, w, h) : null;
  }
  const v = variantFor(img, preferred);
  if (v && hasRenderableUrl(v)) return v.url ?? null;
  return includePlaceholder ? placeholderImageUrl(seed, w, h) : null;
};

/** Largest renderable URL, or placeholder when none. Convenience for hero/full-screen slots. */
export const largestUrl = (
  img: Image | null | undefined,
  seed: string,
  w?: number,
  h?: number,
  includePlaceholder = false,
): string | null => {
  if (img?.useExternalImg) {
    if (img.externalUrl && img.externalUrl.trim() !== "")
      return img.externalUrl;
    return includePlaceholder ? placeholderImageUrl(seed, w, h) : null;
  }
  const v = largestVariant(img);
  if (v && hasRenderableUrl(v)) return v.url ?? null;
  return includePlaceholder ? placeholderImageUrl(seed, w, h) : null;
};

/**
 * Back-compat shim mirroring the previous `displayUrl(image, seed, w, h,
 * includePlaceholder)` signature: hands back the largest available URL.
 * Prefer `resolveImageUrl(img, preferred, …)` in new code so the renderer
 * picks the smallest tier that still satisfies the slot.
 */
export const displayUrl = (
  img: Image | null | undefined,
  seed: string,
  w?: number,
  h?: number,
  includePlaceholder = false,
): string | null => largestUrl(img, seed, w, h, includePlaceholder);
