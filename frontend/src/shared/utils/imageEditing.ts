/**
 * Client-side image-editing helpers for the upload flow: loading a pasted URL's
 * bytes through the same-origin proxy (so the browser can crop them without
 * canvas CORS-taint) and exporting a chosen crop region to an uploadable blob.
 *
 * The crop rectangle is given in the source image's natural-pixel space (the
 * editor converts react-image-crop's displayed-pixel selection up to natural
 * pixels first) — we just draw that sub-rectangle onto a canvas sized to the
 * crop and read it back out.
 */
import { apiBaseUrl } from "@store/emptyApi";

/** A crop rectangle in the source image's natural-pixel coordinates. */
export interface PixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Fetch a remote image URL through the backend's SSRF-guarded proxy
 * (`GET /api/media/remote-image`) and return its bytes as a Blob. Because the
 * response is served from our own origin, the resulting object URL can be drawn
 * to a canvas and exported without tainting it. Throws an `Error` whose message
 * is safe to surface (the backend sends an RFC 9457 `detail` on rejection).
 */
export const fetchRemoteImage = async (url: string): Promise<Blob> => {
  const endpoint = `${apiBaseUrl}/api/media/remote-image?url=${encodeURIComponent(url)}`;
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
    let detail = "Could not fetch an image from that URL.";
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
