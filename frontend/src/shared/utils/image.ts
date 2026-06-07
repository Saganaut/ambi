/**
 * Helpers around the wire `AppImage` shape.
 *
 * The backend models every image-bearing field with the same embeddable record
 * (`media/AppImage.java`):
 *   { external, srcKey, externalSrc, altText, variants: { XS, SM, MD, LG, XL } }
 * — `external` decides the source of truth: an external image (author pasted a
 * URL) holds that URL in `externalSrc` and leaves `variants` empty; an internal
 * (gallery/S3-backed) image holds the original S3 key in `srcKey` and exposes a
 * `variants` map (one entry per `ImageSize` tier) the backend hydrates to
 * renderable URLs on read.
 *
 * > NOTE: the S3 upload + variant-hydration pipeline is still a backend TODO, so
 * > today only `external` images resolve to a real URL. Internal images are
 * > supported here so the call sites are ready the moment that pipeline lands —
 * > `variants` values are treated as renderable URLs (their hydrated form).
 *
 * The constructors below produce the standard "blank / external / internal"
 * shapes so callers don't reach into the object literal. `resolveImageUrl`
 * is the single place renderers go to turn an `AppImage | undefined` into an
 * actual <img src=…> value at a specific tier, falling back to a seeded
 * Lorem Picsum placeholder.
 */
import type { AppImage } from "@store/AmbiApi";

export type ImageSize = "XS" | "SM" | "MD" | "LG" | "XL";

const PLACEHOLDER_W = 640;
const PLACEHOLDER_H = 360;

/** Walk-up order when the requested size is missing — prefer the next-larger
 *  rendition over the next-smaller one so we don't blur a thumbnail to fit
 *  a hero slot. Tier indexes: xs=0, sm=1, md=2, lg=3, xl=4. */
const SIZE_ORDER: ImageSize[] = ["XS", "SM", "MD", "LG", "XL"];

export const externalImage = (url: string): AppImage => ({
  external: true,
  externalSrc: url,
  variants: {},
});

/** An internal (gallery/S3-backed) image, identified by its original S3 key.
 *  Pass the gallery image's `id` when known so the slot can be re-resolved. */
export const internalImage = (srcKey: string, id?: string): AppImage => ({
  external: false,
  srcKey,
  id,
  variants: {},
});

export const emptyImage = (): AppImage => ({
  external: true,
  externalSrc: "",
  variants: {},
});

const hasUrl = (v: string | undefined): v is string =>
  typeof v === "string" && v.trim() !== "";

export const isImageEmpty = (img: AppImage | null | undefined): boolean => {
  if (!img) return true;
  if (img.external) return !hasUrl(img.externalSrc);
  if (!img.variants) return true;
  return !Object.values(img.variants).some(hasUrl);
};

/** Largest variant URL we have, or `undefined` if the image carries none.
 *  External images don't carry tiered variants — callers should check
 *  `external`/`externalSrc` directly when they need the raw URL. */
export const largestVariant = (
  img: AppImage | null | undefined,
): string | undefined => {
  const variants = img?.variants;
  if (!variants) return undefined;
  for (let i = SIZE_ORDER.length - 1; i >= 0; i--) {
    const hit = variants[SIZE_ORDER[i]];
    if (hasUrl(hit)) return hit;
  }
  return undefined;
};

/** Pick the variant URL for the requested size, or the next-largest available
 *  (then smaller sizes as last resort). Returns undefined for external
 *  images and for empty internal images. */
export const variantFor = (
  img: AppImage | null | undefined,
  preferred: ImageSize,
): string | undefined => {
  const variants = img?.variants;
  if (!variants) return undefined;
  const startIdx = SIZE_ORDER.indexOf(preferred);
  if (startIdx < 0) return largestVariant(img);
  for (let i = startIdx; i < SIZE_ORDER.length; i++) {
    const hit = variants[SIZE_ORDER[i]];
    if (hasUrl(hit)) return hit;
  }
  for (let i = startIdx - 1; i >= 0; i--) {
    const hit = variants[SIZE_ORDER[i]];
    if (hasUrl(hit)) return hit;
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
 * Resolve an `AppImage | undefined` to a renderable URL at the requested size.
 * Falls back to a Lorem Picsum placeholder seeded on `seed` (typically the
 * parent element/option id) when `includePlaceholder` is true.
 */
export const resolveImageUrl = (
  img: AppImage | null | undefined,
  preferred: ImageSize,
  seed: string,
  w?: number,
  h?: number,
  includePlaceholder = false,
): string | null => {
  if (img?.external) {
    if (hasUrl(img.externalSrc)) return img.externalSrc ?? null;
    return includePlaceholder ? placeholderImageUrl(seed, w, h) : null;
  }
  const url = variantFor(img, preferred);
  if (url) return url;
  return includePlaceholder ? placeholderImageUrl(seed, w, h) : null;
};

/** Largest renderable URL, or placeholder when none. Convenience for hero/full-screen slots. */
export const largestUrl = (
  img: AppImage | null | undefined,
  seed: string,
  w?: number,
  h?: number,
  includePlaceholder = false,
): string | null => {
  if (img?.external) {
    if (hasUrl(img.externalSrc)) return img.externalSrc ?? null;
    return includePlaceholder ? placeholderImageUrl(seed, w, h) : null;
  }
  const url = largestVariant(img);
  if (url) return url;
  return includePlaceholder ? placeholderImageUrl(seed, w, h) : null;
};

/**
 * Back-compat shim mirroring the previous `displayUrl(image, seed, w, h,
 * includePlaceholder)` signature: hands back the largest available URL.
 * Prefer `resolveImageUrl(img, preferred, …)` in new code so the renderer
 * picks the smallest tier that still satisfies the slot.
 */
export const displayUrl = (
  img: AppImage | null | undefined,
  seed: string,
  w?: number,
  h?: number,
  includePlaceholder = false,
): string | null => largestUrl(img, seed, w, h, includePlaceholder);
