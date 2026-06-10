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
  Palette,
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

// ─── Palette building blocks ─────────────────────────────────────────────────

const elvenTwilightPalette: Palette = {
  canvas: "#1a1c2e",
  surface: "#252843",
  surfaceRaised: "#303459",
  subtle: "#141526",
  foreground: "#e6e9f5",
  mutedForeground: "#9aa0c4",
  primary: "#7c83ff",
  onPrimary: "#1a1c2e",
  accent: "#9be8c8",
  accentSecondary: "#c0a0ff",
  border: "#303459",
  borderSubtle: "#252843",
  red: "#ff6b6b",
  green: "#7bd88f",
  yellow: "#e8d27b",
  blue: "#7c83ff",
};

const wizardsCounselPalette: Palette = {
  canvas: "#f7f5fb",
  surface: "#ece8f6",
  surfaceRaised: "#ffffff",
  subtle: "#ddd6ee",
  foreground: "#2a2545",
  mutedForeground: "#6a6385",
  primary: "#6f4ad1",
  onPrimary: "#f7f5fb",
  accent: "#1f8f9e",
  accentSecondary: "#d99a2b",
  border: "#bcb0dd",
  borderSubtle: "#ddd6ee",
  red: "#cf3a3a",
  green: "#2f9e44",
  yellow: "#c98a1a",
  blue: "#3a6fd1",
};

// ─── ThemeSpec building blocks ───────────────────────────────────────────────

export const mockElvenTwilightSpec: ThemeSpec = {
  appearance: "DARK",
  palette: elvenTwilightPalette,
  backgroundImage: externalImage(
    "https://picsum.photos/seed/rivendell-bg/1920/1080",
  ),
  logoImage: externalImage("https://picsum.photos/seed/evenstar-logo/256/256"),
};

export const mockWizardsCounselSpec: ThemeSpec = {
  appearance: "LIGHT",
  palette: wizardsCounselPalette,
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
    appearance: "LIGHT",
    palette: {
      canvas: "#f6f4e8",
      surface: "#ece7d2",
      surfaceRaised: "#fffdf3",
      subtle: "#ded7bd",
      foreground: "#3a3220",
      mutedForeground: "#6f6647",
      primary: "#6a8f3c",
      onPrimary: "#f6f4e8",
      accent: "#c08a2d",
      accentSecondary: "#4a8f6a",
      border: "#c4ba94",
      borderSubtle: "#ded7bd",
      red: "#b5402a",
      green: "#5a8f2c",
      yellow: "#c08a2d",
      blue: "#3a78a0",
    },
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
    appearance: "LIGHT",
    palette: {
      canvas: "#f5efe2",
      surface: "#eae0c9",
      surfaceRaised: "#fdf8ec",
      subtle: "#dbcfae",
      foreground: "#3d3320",
      mutedForeground: "#766a48",
      primary: "#c2892c",
      onPrimary: "#3d3320",
      accent: "#4f8f5a",
      accentSecondary: "#a8702a",
      border: "#cabf95",
      borderSubtle: "#dbcfae",
      red: "#b5402a",
      green: "#4f8f5a",
      yellow: "#c2892c",
      blue: "#3a78a0",
    },
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
    appearance: "LIGHT",
    palette: {
      canvas: "#f4f6f8",
      surface: "#e7ebef",
      surfaceRaised: "#ffffff",
      subtle: "#d6dce2",
      foreground: "#26303a",
      mutedForeground: "#5d6873",
      primary: "#5a7d99",
      onPrimary: "#f4f6f8",
      accent: "#7a6bb5",
      accentSecondary: "#3a9aa8",
      border: "#b9c3cc",
      borderSubtle: "#d6dce2",
      red: "#c0473a",
      green: "#3f9e6a",
      yellow: "#c2972c",
      blue: "#3a78c0",
    },
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
