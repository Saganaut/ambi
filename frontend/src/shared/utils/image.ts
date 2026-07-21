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
 * Internal images are produced by the gallery upload pipeline (multipart →
 * S3/Garage → per-tier WebP); the backend stores opaque S3 keys and hydrates each
 * `variants` value to a short-lived presigned URL on read (regenerated every
 * load), so callers here treat `variants` values as ready-to-render URLs
 * regardless of source.
 *
 * The constructors below produce the standard "blank / external / internal"
 * shapes so callers don't reach into the object literal. `resolveImageUrl`
 * is the single place renderers go to turn an `AppImage | undefined` into an
 * actual <img src=…> value at a specific tier, falling back to a seeded
 * first-party placeholder (`placeholderImageUrl`).
 */
import type { AppImage } from "@features/gallery/store/galleryApi.gen";

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

/** Stable hue (0–359) derived from a seed, so a given slot always lands on the
 *  same placeholder tint across renders — the deterministic-variety Lorem Picsum
 *  used to give us, minus the third-party request. */
const seedHue = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
};

/**
 * A first-party placeholder used when an image slot is empty: an inline SVG
 * data URI (no network request, no external dependency) — a soft, seed-tinted
 * panel with a centred photo glyph. Seeding keeps each slot's tint stable and
 * gives a wall of empty cards gentle variety, the way Lorem Picsum did before.
 */
export const placeholderImageUrl = (
  seed: string,
  w: number = PLACEHOLDER_W,
  h: number = PLACEHOLDER_H,
): string => {
  const hue = seedHue(seed);
  const bg = `hsl(${hue} 22% 90%)`;
  const fg = `hsl(${hue} 16% 60%)`;
  const glyph = Math.round(Math.min(w, h) * 0.34);
  const gx = Math.round((w - glyph) / 2);
  const gy = Math.round((h - glyph) / 2);
  // heroicons `photo` (outline), stroked; nested <svg> re-scales its 24-unit
  // viewBox to the centred glyph box regardless of the panel's aspect ratio.
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ` +
    `viewBox="0 0 ${w} ${h}" role="img" aria-hidden="true">` +
    `<rect width="100%" height="100%" fill="${bg}"/>` +
    `<svg x="${gx}" y="${gy}" width="${glyph}" height="${glyph}" viewBox="0 0 24 24" ` +
    `fill="none" stroke="${fg}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 19.5h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25z"/>` +
    `</svg></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * Resolve an `AppImage | undefined` to a renderable URL at the requested size.
 * Falls back to a first-party placeholder seeded on `seed` (typically the
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
