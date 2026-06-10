/**
 * LOTR-themed mock data for the theme feature's response DTOs.
 *
 * Use these for Storybook stories, isolated component dev, unit tests, and
 * bootstrapping a screen before its query is wired up.
 *
 * Conventions:
 *  - Every type is imported from `themeApi.gen.ts` so these mocks stay in sync
 *    with codegen — if a field is added or renamed, TypeScript fails here
 *    before it fails in a real consumer.
 *  - IDs (`theme_*`) and owner ids (`u_*`) are stable and cross-link with the
 *    other feature mock files (`accountMockData`, `deckMockData`).
 */
import { externalImage } from "@utils/image";

import type {
  Ownership,
  ThemeResponse,
  ThemeSpec,
  ViewerPermissions,
} from "../store/themeApi.gen";

// ─── shared primitives ──────────────────────────────────────────────────────

const THIRD_AGE = "3018-12-25T18:00:00Z";
const RECENT = "2026-05-15T09:00:00Z";

const ownedBy = (ownerId: string): Ownership => ({ type: "USER", ownerId });

const fullPermissions: ViewerPermissions = {
  canView: true,
  canEdit: true,
  canManage: true,
};

const viewOnly: ViewerPermissions = {
  canView: true,
  canEdit: false,
  canManage: false,
};

// ─── ThemeSpec building blocks ───────────────────────────────────────────────

export const mockElvenTwilightSpec: ThemeSpec = {
  mode: "DARK",
  huePrimary: 230,
  hueAccent: 100,
  backgroundImage: externalImage(
    "https://picsum.photos/seed/rivendell-bg/1920/1080",
  ),
  logoImage: externalImage("https://picsum.photos/seed/evenstar-logo/256/256"),
};

export const mockWizardsCounselSpec: ThemeSpec = {
  mode: "LIGHT",
  huePrimary: 270,
  hueAccent: 50,
  backgroundImage: externalImage(
    "https://picsum.photos/seed/isengard-bg/1920/1080",
  ),
  logoImage: externalImage("https://picsum.photos/seed/staff-logo/256/256"),
};

// ─── Themes ─────────────────────────────────────────────────────────────────

export const mockElvenTwilightTheme: ThemeResponse = {
  id: "theme_elven_twilight",
  name: "Elven Twilight",
  ownership: ownedBy("u_frodo"),
  organizationId: "org_fellowship",
  creatorUserId: "u_frodo",
  builtIn: false,
  spec: mockElvenTwilightSpec,
  createdAt: THIRD_AGE,
  updatedAt: RECENT,
  permissions: fullPermissions,
};

export const mockWizardsCounselTheme: ThemeResponse = {
  id: "theme_wizards_counsel",
  name: "Wizard's Counsel",
  ownership: ownedBy("u_gandalf"),
  organizationId: "org_white_council",
  creatorUserId: "u_gandalf",
  builtIn: false,
  spec: mockWizardsCounselSpec,
  createdAt: "1019-01-01T00:00:00Z",
  updatedAt: RECENT,
  permissions: fullPermissions,
};

export const mockShireMorningTheme: ThemeResponse = {
  id: "theme_shire_morning",
  name: "Shire Morning",
  ownership: ownedBy("u_sam"),
  creatorUserId: "u_sam",
  builtIn: false,
  spec: {
    mode: "LIGHT",
    huePrimary: 95,
    hueAccent: 30,
    backgroundImage: externalImage(
      "https://picsum.photos/seed/shire-bg/1920/1080",
    ),
    logoImage: externalImage(
      "https://picsum.photos/seed/green-dragon-logo/256/256",
    ),
  },
  createdAt: THIRD_AGE,
  updatedAt: RECENT,
  permissions: fullPermissions,
};

export const mockPlainsOfRohanTheme: ThemeResponse = {
  id: "theme_plains_of_rohan",
  name: "Plains of Rohan",
  ownership: ownedBy("u_aragorn"),
  creatorUserId: "u_aragorn",
  builtIn: false,
  spec: {
    mode: "LIGHT",
    huePrimary: 35,
    hueAccent: 145,
    backgroundImage: externalImage(
      "https://picsum.photos/seed/rohan-bg/1920/1080",
    ),
    logoImage: externalImage(
      "https://picsum.photos/seed/white-horse-logo/256/256",
    ),
  },
  createdAt: THIRD_AGE,
  updatedAt: RECENT,
  permissions: fullPermissions,
};

// A built-in (system) theme — owned by no one, read-only to everyone.
export const mockMithrilBuiltInTheme: ThemeResponse = {
  id: "theme_mithril",
  name: "Mithril",
  builtIn: true,
  spec: {
    mode: "SYSTEM",
    huePrimary: 210,
    hueAccent: 280,
  },
  createdAt: "1019-01-01T00:00:00Z",
  updatedAt: "1019-01-01T00:00:00Z",
  permissions: viewOnly,
};

export const mockThemes: ThemeResponse[] = [
  mockElvenTwilightTheme,
  mockWizardsCounselTheme,
  mockShireMorningTheme,
  mockPlainsOfRohanTheme,
];

export const mockBuiltInThemes: ThemeResponse[] = [mockMithrilBuiltInTheme];
