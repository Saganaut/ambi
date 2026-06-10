/**
 * LOTR-themed mock data for the gallery feature's response DTOs.
 *
 * Use these for Storybook stories, isolated component dev, unit tests, and
 * bootstrapping a screen before its query is wired up.
 *
 * Conventions:
 *  - Every type is imported from `galleryApi.gen.ts` so these mocks stay in sync
 *    with codegen — if a field is added or renamed, TypeScript fails here
 *    before it fails in a real consumer.
 *  - Gallery-backed images use the internal `AppImage` shape (`external: false`
 *    + `srcKey` + a per-tier `variants` map), mirroring what the upload pipeline
 *    produces; the `variants` values stand in for hydrated presigned URLs.
 *  - Owner ids (`u_*`) cross-link with the other feature mock files.
 */
import type {
  AppImage,
  GalleryImageResponse,
  GalleryResponse,
  Ownership,
  ViewerPermissions,
} from "../store/galleryApi.gen";

// ─── shared primitives ──────────────────────────────────────────────────────

const THIRD_AGE = "3018-12-25T18:00:00Z";
const RECENT = "2026-05-15T09:00:00Z";

const ownedBy = (ownerId: string): Ownership => ({ type: "USER", ownerId });

const fullPermissions: ViewerPermissions = {
  canView: true,
  canEdit: true,
  canManage: true,
};

/** A gallery/S3-backed image: opaque `srcKey` plus a per-tier `variants` map
 *  whose values stand in for the presigned URLs the backend hydrates on read. */
const backedImage = (seed: string, altText: string): AppImage => ({
  external: false,
  srcKey: `gallery/${seed}.webp`,
  altText,
  variants: {
    XS: `https://picsum.photos/seed/${seed}/80/80`,
    SM: `https://picsum.photos/seed/${seed}/240/240`,
    MD: `https://picsum.photos/seed/${seed}/600/600`,
    LG: `https://picsum.photos/seed/${seed}/1200/1200`,
    XL: `https://picsum.photos/seed/${seed}/2000/2000`,
  },
});

// ─── Galleries ───────────────────────────────────────────────────────────────

export const mockFellowshipGallery: GalleryResponse = {
  id: "gallery_fellowship",
  name: "Fellowship Imagery",
  ownership: ownedBy("u_aragorn"),
  organizationId: "org_fellowship",
  creatorUserId: "u_aragorn",
  version: 4,
  imageCount: 3,
  createdAt: THIRD_AGE,
  updatedAt: RECENT,
  permissions: fullPermissions,
};

// ─── Gallery images ──────────────────────────────────────────────────────────

export const mockEvenstarImage: GalleryImageResponse = {
  id: "gallery_img_evenstar",
  galleryId: mockFellowshipGallery.id,
  image: backedImage("evenstar", "The Evenstar pendant of Arwen."),
  name: "Evenstar",
  creatorUserId: "u_aragorn",
  createdAt: THIRD_AGE,
  updatedAt: RECENT,
};

export const mockAndurilImage: GalleryImageResponse = {
  id: "gallery_img_anduril",
  galleryId: mockFellowshipGallery.id,
  image: backedImage("anduril", "Andúril, reforged from the shards of Narsil."),
  name: "Andúril, Flame of the West",
  creatorUserId: "u_aragorn",
  createdAt: THIRD_AGE,
  updatedAt: RECENT,
};

export const mockBagEndImage: GalleryImageResponse = {
  id: "gallery_img_bag_end",
  galleryId: mockFellowshipGallery.id,
  image: backedImage("bag-end", "The round green door of Bag End."),
  name: "Bag End",
  creatorUserId: "u_frodo",
  createdAt: THIRD_AGE,
  updatedAt: RECENT,
};

export const mockGalleryImages: GalleryImageResponse[] = [
  mockEvenstarImage,
  mockAndurilImage,
  mockBagEndImage,
];
