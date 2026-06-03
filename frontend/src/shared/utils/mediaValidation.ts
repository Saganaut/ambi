// Shared client-side media-upload validation. Mirrors the backend per-kind
// caps in MediaProcessingService — backend is the source of truth, but
// rejecting obvious junk before the multipart request saves a round trip and
// gives the user a faster error. Audio + video accept only the formats the
// backend currently passes through (MP3 / M4A / MP4).
import type { MediaAssetResponse } from "@store/AmbiApi";

export type MediaKind = NonNullable<MediaAssetResponse["kind"]>;

export interface MediaTier {
  maxBytes: number;
  maxBytesLabel: string;
  acceptedMimes: readonly string[];
  acceptedLabel: string;
}

export const MEDIA_TIERS = {
  IMAGE: {
    maxBytes: 5 * 1024 * 1024,
    maxBytesLabel: "5 MB",
    acceptedMimes: ["image/jpeg", "image/png", "image/webp"],
    acceptedLabel: "JPEG, PNG, or WebP",
  },
  AUDIO: {
    maxBytes: 20 * 1024 * 1024,
    maxBytesLabel: "20 MB",
    acceptedMimes: ["audio/mpeg", "audio/mp4", "audio/m4a", "audio/x-m4a"],
    acceptedLabel: "MP3 or M4A",
  },
  VIDEO_FILE: {
    maxBytes: 100 * 1024 * 1024,
    maxBytesLabel: "100 MB",
    acceptedMimes: ["video/mp4"],
    acceptedLabel: "MP4",
  },
} as const satisfies Record<string, MediaTier>;

export type FileMediaKind = keyof typeof MEDIA_TIERS;

export const validateMediaFile = (
  file: File,
  kind: FileMediaKind,
): string | null => {
  const tier: MediaTier = MEDIA_TIERS[kind];
  // Browsers report audio/m4a, audio/x-m4a, and audio/mp4 interchangeably for
  // the same payload; accept any of them and let the backend's byte-header
  // detector decide.
  if (file.type && !tier.acceptedMimes.includes(file.type)) {
    return `Invalid file type. Please upload a ${tier.acceptedLabel}.`;
  }
  if (file.size > tier.maxBytes) {
    return `File is too large. Maximum size is ${tier.maxBytesLabel}.`;
  }
  return null;
};

/** Maps a MediaKind that can be uploaded as a file to its validation tier. */
export const isFileMediaKind = (kind: MediaKind): kind is FileMediaKind =>
  kind in MEDIA_TIERS;
