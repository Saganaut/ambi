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
  ThemeSpec,
  UserPreferences,
  UserProfileResponse,
} from "../store/accountApi.gen";

// ─── Avatars ─────────────────────────────────────────────────────────────────

const externalAvatar = (seed: string): Avatar => ({
  external: true,
  externalSrc: `https://picsum.photos/seed/${seed}/200/200`,
});

// ─── ThemeSpecs (preferences carry an embedded theme override) ───────────────

const elvenTwilightSpec: ThemeSpec = {
  mode: "DARK",
  huePrimary: 230,
  hueAccent: 100,
};

const shireMorningSpec: ThemeSpec = {
  mode: "LIGHT",
  huePrimary: 95,
  hueAccent: 30,
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
  avatar: externalAvatar("frodo"),
  preferences: mockFrodoPreferences,
};

export const mockGandalfProfile: UserProfileResponse = {
  publicId: "u_gandalf",
  username: "Mithrandir",
  displayName: "Gandalf the Grey",
  email: "mithrandir@valinor.aman",
  timezone: "Middle-earth/Rivendell",
  userLevel: "ADMIN",
  avatar: externalAvatar("gandalf"),
  preferences: {
    newsletter: false,
    marketing: false,
    theme: { mode: "LIGHT", huePrimary: 270, hueAccent: 50 },
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
  avatar: externalAvatar("aragorn"),
  preferences: {
    newsletter: true,
    marketing: false,
    theme: { mode: "LIGHT", huePrimary: 35, hueAccent: 145 },
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
  avatar: externalAvatar("sam"),
  preferences: mockSamPreferences,
};

export const mockProfiles: UserProfileResponse[] = [
  mockFrodoProfile,
  mockGandalfProfile,
  mockAragornProfile,
  mockSamProfile,
];
