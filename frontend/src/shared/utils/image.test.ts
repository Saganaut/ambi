// Pins the tier walk resolveImageUrl runs: the requested rendition wins, a
// missing one steps up to the next-larger (then down to smaller ones), and an
// image whose renditions aren't derived yet still renders through its original.
// Variant generation is asynchronous, so a partial or empty `variants` map is a
// normal state, not a broken image.
import { describe, it, expect } from "vitest";
import type { AppImage } from "@features/gallery/store/galleryApi.gen";
import { isImageEmpty, resolveImageUrl } from "./image";

const ORIGINAL = "https://s3.test/gallery/x/original?sig=abc";

const internal = (overrides: Partial<AppImage> = {}): AppImage => ({
  external: false,
  srcKey: ORIGINAL,
  variants: {},
  ...overrides,
});

describe("resolveImageUrl", () => {
  it("returns the requested tier when it is stored", () => {
    const img = internal({
      variants: { SM: "https://s3.test/sm", MD: "https://s3.test/md" },
    });
    expect(resolveImageUrl(img, "MD", "seed")).toBe("https://s3.test/md");
  });

  it("steps up to the next-larger tier before settling for a smaller one", () => {
    const img = internal({
      variants: { XS: "https://s3.test/xs", XL: "https://s3.test/xl" },
    });
    // Blurring a 64px thumbnail into a 480px slot is the worse trade.
    expect(resolveImageUrl(img, "MD", "seed")).toBe("https://s3.test/xl");
  });

  it("settles for the largest smaller tier when nothing above the request exists", () => {
    const img = internal({
      variants: { XS: "https://s3.test/xs", SM: "https://s3.test/sm" },
    });
    expect(resolveImageUrl(img, "LG", "seed")).toBe("https://s3.test/sm");
  });

  it("falls back to the original when the map is empty", () => {
    expect(resolveImageUrl(internal(), "SM", "seed")).toBe(ORIGINAL);
  });

  it("falls back to the original when the map is absent entirely", () => {
    expect(resolveImageUrl(internal({ variants: undefined }), "SM", "seed")).toBe(
      ORIGINAL,
    );
  });

  it("prefers any stored tier over the original, however far from the request", () => {
    const img = internal({ variants: { XS: "https://s3.test/xs" } });
    expect(resolveImageUrl(img, "XL", "seed")).toBe("https://s3.test/xs");
  });

  it("never returns a placeholder for an image that still has its original", () => {
    expect(resolveImageUrl(internal(), "MD", "seed", 200, 200, true)).toBe(ORIGINAL);
  });

  it("ignores a raw S3 key, which no browser can load", () => {
    // Only a hydrated (presigned) srcKey is renderable; a client-minted image
    // holds the opaque key, and rendering it would fire a same-origin request
    // for a path that doesn't exist.
    const img = internal({ srcKey: "gallery/x/original" });
    expect(resolveImageUrl(img, "MD", "seed")).toBeNull();
    expect(resolveImageUrl(img, "MD", "seed", 200, 200, true)).toContain(
      "data:image/svg+xml",
    );
  });

  it("resolves an external image through its own URL, tiers or not", () => {
    const img: AppImage = {
      external: true,
      externalSrc: "https://elsewhere/cat.png",
      variants: {},
    };
    expect(resolveImageUrl(img, "MD", "seed")).toBe("https://elsewhere/cat.png");
  });

  it("placeholders only a genuinely empty image", () => {
    const nothing: AppImage = { external: false, variants: {} };
    expect(resolveImageUrl(nothing, "MD", "seed")).toBeNull();
    expect(resolveImageUrl(undefined, "MD", "seed", 100, 100, true)).toContain(
      "data:image/svg+xml",
    );
  });
});

describe("isImageEmpty", () => {
  it("counts a stored image with no renditions yet as present", () => {
    expect(isImageEmpty(internal())).toBe(false);
    expect(isImageEmpty(internal({ srcKey: "gallery/x/original" }))).toBe(false);
  });

  it("counts an image carrying neither original nor variant as empty", () => {
    expect(isImageEmpty({ external: false, variants: {} })).toBe(true);
    expect(isImageEmpty({ external: true, externalSrc: "", variants: {} })).toBe(true);
    expect(isImageEmpty(null)).toBe(true);
  });
});
