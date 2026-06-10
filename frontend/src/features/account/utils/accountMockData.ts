/**
 * LOTR-themed mock data for the account feature's profile / preferences DTOs.
 *
 * Use these for Storybook stories, isolated component dev, unit tests, and
 * bootstrapping a screen before its query is wired up.
 *
 * Conventions:
 *  - Every type is imported from `accountApi.gen.ts` so these mocks stay in sync
 *    with codegen — if a field is added or renamed, TypeScript fails here
 *    before it fails in a real consumer.
 *  - `publicId`s (`u_*`) and `activeThemeId`s (`theme_*`) cross-link with the
 *    `themeMockData` and `deckMockData` files.
 */
import type {
  Avatar,
  Palette,
  ThemeSpec,
  UserPreferences,
  UserProfileResponse,
} from "../store/accountApi.gen";

// ─── Avatars ─────────────────────────────────────────────────────────────────

// Gallery-backed avatar mock: an external AppImage keeps the picsum URL
// renderable without presigned variants.
const imageAvatar = (seed: string): Avatar => ({
  image: {
    external: true,
    externalSrc: `https://picsum.photos/seed/${seed}/200/200`,
    variants: {},
  },
});

// ─── ThemeSpecs (preferences carry an embedded theme override) ───────────────

const darkPalette: Palette = {
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

const lightPalette: Palette = {
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
};

const elvenTwilightSpec: ThemeSpec = {
  appearance: "DARK",
  palette: darkPalette,
};

const shireMorningSpec: ThemeSpec = {
  appearance: "LIGHT",
  palette: lightPalette,
};

// ─── Preferences ─────────────────────────────────────────────────────────────

export const mockFrodoPreferences: UserPreferences = {
  newsletter: true,
  marketing: false,
  theme: elvenTwilightSpec,
  stayLoggedIn: true,
};

export const mockSamPreferences: UserPreferences = {
  newsletter: true,
  marketing: true,
  theme: shireMorningSpec,
  stayLoggedIn: false,
};

// ─── Profiles ────────────────────────────────────────────────────────────────

export const mockFrodoProfile: UserProfileResponse = {
  publicId: "u_frodo",
  username: "RingBearer99",
  displayName: "Frodo Baggins",
  email: "frodo@baggins.shire",
  timezone: "Middle-earth/Shire",
  userLevel: "PREMIUM_USER",
  avatar: imageAvatar("frodo"),
  preferences: mockFrodoPreferences,
};

export const mockGandalfProfile: UserProfileResponse = {
  publicId: "u_gandalf",
  username: "Mithrandir",
  displayName: "Gandalf the Grey",
  email: "mithrandir@valinor.aman",
  timezone: "Middle-earth/Rivendell",
  userLevel: "ADMIN",
  avatar: imageAvatar("gandalf"),
  preferences: {
    newsletter: false,
    marketing: false,
    theme: { appearance: "LIGHT", palette: lightPalette },
    stayLoggedIn: true,
  },
};

export const mockAragornProfile: UserProfileResponse = {
  publicId: "u_aragorn",
  username: "Strider",
  displayName: "Aragorn II Elessar",
  email: "strider@dunedain.eriador",
  timezone: "Middle-earth/Gondor",
  userLevel: "USER",
  avatar: imageAvatar("aragorn"),
  preferences: {
    newsletter: true,
    marketing: false,
    theme: { appearance: "LIGHT", palette: lightPalette },
    stayLoggedIn: false,
  },
};

export const mockSamProfile: UserProfileResponse = {
  publicId: "u_sam",
  username: "GardenerOfTheYear",
  displayName: "Samwise Gamgee",
  email: "sam@gamgee.shire",
  timezone: "Middle-earth/Shire",
  userLevel: "USER",
  avatar: imageAvatar("sam"),
  preferences: mockSamPreferences,
};

export const mockProfiles: UserProfileResponse[] = [
  mockFrodoProfile,
  mockGandalfProfile,
  mockAragornProfile,
  mockSamProfile,
];
