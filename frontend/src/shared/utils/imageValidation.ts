// Shared client-side image-upload validation. The backend re-validates every
// upload (and is the source of truth — these tiers mirror
// ImageProcessingService) but rejecting obvious junk before the multipart
// request saves a round trip and gives the user a faster error.
export interface ImageTier {
  maxBytes: number;
  maxBytesLabel: string;
  acceptedMimes: readonly string[];
  acceptedLabel: string;
}

export const IMAGE_TIERS = {
  avatar: {
    maxBytes: 1024 * 1024,
    maxBytesLabel: "1 MB",
    acceptedMimes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    acceptedLabel: "JPEG, PNG, WebP, or GIF",
  },
  logo: {
    maxBytes: 2 * 1024 * 1024,
    maxBytesLabel: "2 MB",
    acceptedMimes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    acceptedLabel: "JPEG, PNG, WebP, or GIF",
  },
  background: {
    maxBytes: 5 * 1024 * 1024,
    maxBytesLabel: "5 MB",
    acceptedMimes: ["image/jpeg", "image/png", "image/webp"],
    acceptedLabel: "JPEG, PNG, or WebP",
  },
  gallery: {
    maxBytes: 5 * 1024 * 1024,
    maxBytesLabel: "5 MB",
    acceptedMimes: ["image/jpeg", "image/png", "image/webp"],
    acceptedLabel: "JPEG, PNG, or WebP",
  },
} as const satisfies Record<string, ImageTier>;

export type ImageTierName = keyof typeof IMAGE_TIERS;

export const validateImageFile = (
  file: File,
  tierName: ImageTierName,
): string | null => {
  const tier = IMAGE_TIERS[tierName];
  if (!(tier.acceptedMimes as readonly string[]).includes(file.type)) {
    return `Invalid file type. Please upload a ${tier.acceptedLabel}.`;
  }
  if (file.size > tier.maxBytes) {
    return `Image is too large. Maximum size is ${tier.maxBytesLabel}.`;
  }
  return null;
};
