/**
 * Client-side image-editing helpers for the upload flow: loading a source
 * image's bytes from our own origin (so the browser can crop them without
 * canvas CORS-taint) — a pasted URL through the SSRF-guarded proxy, a gallery
 * image through its `/file` route — and exporting a chosen crop region to an
 * uploadable blob.
 *
 * The crop rectangle is given in the source image's natural-pixel space (the
 * editor converts react-image-crop's displayed-pixel selection up to natural
 * pixels first) — we just draw that sub-rectangle onto a canvas sized to the
 * crop and read it back out.
 */
import type { AppImage } from "@features/gallery/store/galleryApi.gen";
import { apiBaseUrl } from "@store/emptyApi";

/** A crop rectangle in the source image's natural-pixel coordinates. */
export interface PixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Addresses the gallery image a crop was cut from. */
export interface CropSourceRef {
  galleryId: string;
  imageId: string;
}

/**
 * Where a placement crop came from, stamped on the crop's
 * `AppImage.metadata.crop` so re-cropping can reopen the editor on the original
 * instead of on already-cropped pixels. Advisory and best-effort: it is absent
 * on older placements, stale if the source was replaced, and client-supplied on
 * echo-back, so a mismatch means "no provenance", never an error. Every key is a
 * literal dot-free identifier — Mongo rejects dots in persisted map keys.
 */
export interface CropProvenance extends CropSourceRef {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The one metadata key provenance lives under. */
const CROP_METADATA_KEY = "crop";

/** Copy of `image` carrying the crop provenance the backend echoes back. */
export const withCropProvenance = (
  image: AppImage,
  source: CropSourceRef,
  area: PixelArea,
): AppImage => ({
  ...image,
  metadata: {
    ...image.metadata,
    [CROP_METADATA_KEY]: {
      sourceGalleryId: source.galleryId,
      sourceImageId: source.imageId,
      x: Math.round(area.x),
      y: Math.round(area.y),
      width: Math.round(area.width),
      height: Math.round(area.height),
    },
  },
});

const finitePositive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Read back {@link withCropProvenance}, or null when it is absent or malformed. */
export const readCropProvenance = (
  image: AppImage | undefined,
): CropProvenance | null => {
  const raw: unknown = image?.metadata?.[CROP_METADATA_KEY];
  if (typeof raw !== "object" || raw === null) return null;
  const { sourceGalleryId, sourceImageId, x, y, width, height } =
    raw as Record<string, unknown>;
  if (typeof sourceGalleryId !== "string" || sourceGalleryId === "") return null;
  if (typeof sourceImageId !== "string" || sourceImageId === "") return null;
  if (!finite(x) || !finite(y)) return null;
  if (!finitePositive(width) || !finitePositive(height)) return null;
  return { galleryId: sourceGalleryId, imageId: sourceImageId, x, y, width, height };
};

/**
 * GET an image-bytes endpoint of our own backend and return the payload as a
 * Blob. Both callers below need the same shape: a credentialed same-origin
 * request, a network failure reported as such, and an RFC 9457 `detail` lifted
 * out of an error body when the backend sent one (falling back to `fallback`,
 * which is written to be safe to show the user).
 */
const fetchImageBytes = async (
  endpoint: string,
  fallback: string,
): Promise<Blob> => {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      credentials: "include",
      headers: { Accept: "image/*" },
    });
  } catch {
    throw new Error("Could not reach the server to fetch that image.");
  }
  if (!response.ok) {
    let detail = fallback;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    throw new Error(detail);
  }
  return response.blob();
};

/**
 * Fetch a remote image URL through the backend's SSRF-guarded proxy
 * (`GET /api/media/remote-image`) and return its bytes as a Blob. Because the
 * response is served from our own origin, the resulting object URL can be drawn
 * to a canvas and exported without tainting it. Throws an `Error` whose message
 * is safe to surface (the backend sends an RFC 9457 `detail` on rejection).
 */
export const fetchRemoteImage = async (url: string): Promise<Blob> =>
  fetchImageBytes(
    `${apiBaseUrl}/api/media/remote-image?url=${encodeURIComponent(url)}`,
    "Could not fetch an image from that URL.",
  );

/**
 * Fetch a gallery image's stored original from our own origin
 * (`GET /api/galleries/{id}/images/{imageId}/file`) so it can be re-cropped.
 * The presigned URLs a gallery read hands out point at the storage endpoint,
 * which is cross-origin and sends no CORS headers — drawing one to a canvas
 * taints it — and the remote-image proxy above rejects that endpoint by design
 * (it is exactly what its SSRF guards exist to block). Hence a dedicated route.
 */
export const fetchGalleryImageFile = async (
  galleryId: string,
  imageId: string,
): Promise<Blob> =>
  fetchImageBytes(
    `${apiBaseUrl}/api/galleries/${encodeURIComponent(galleryId)}/images/${encodeURIComponent(imageId)}/file`,
    "Could not load that image from your gallery.",
  );

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    // Harmless for the blob:/object URLs we pass (already same-origin); set so
    // the canvas stays untainted if a same-origin remote URL is ever used.
    image.crossOrigin = "anonymous";
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error("Could not load the image for cropping."));
    };
    image.src = src;
  });

// Prefer WebP (small, alpha-capable); fall back to PNG if a browser can't encode
// it. Both are in the backend's accepted-content-type allow-list.
const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (webp) => {
        if (webp && webp.type === "image/webp") {
          resolve(webp);
          return;
        }
        canvas.toBlob(
          (png) => {
            if (png) resolve(png);
            else reject(new Error("Could not export the cropped image."));
          },
          "image/png",
        );
      },
      "image/webp",
      0.92,
    );
  });

/**
 * Crop `imageSrc` (an object/blob URL) to `area` (natural-pixel rectangle from
 * react-easy-crop) and return the result as an uploadable Blob.
 */
export const getCroppedBlob = async (
  imageSrc: string,
  area: PixelArea,
): Promise<Blob> => {
  const image = await loadImage(imageSrc);
  const width = Math.round(area.width);
  const height = Math.round(area.height);
  if (width <= 0 || height <= 0) {
    throw new Error("The crop selection is empty.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get a drawing context for cropping.");
  }
  ctx.drawImage(
    image,
    Math.round(area.x),
    Math.round(area.y),
    width,
    height,
    0,
    0,
    width,
    height,
  );
  return canvasToBlob(canvas);
};
