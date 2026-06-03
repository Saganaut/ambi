import type {
  DeckResponse,
  McqContent,
  NumberContent,
  RegisteredMe,
  SlideResponse,
} from "@store/AmbiApi";

export type PublishStatus = DeckResponse["publishStatus"];
export const PublishStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const satisfies Record<PublishStatus, PublishStatus>;

export type DeckVisibility = DeckResponse["visibility"];
export const DeckVisibility = {
  PRIVATE: "PRIVATE",
  UNLISTED: "UNLISTED",
  ORG: "ORG",
  PUBLIC: "PUBLIC",
} as const satisfies Record<DeckVisibility, DeckVisibility>;

export type SlideType = SlideResponse["slideType"];
export const SlideType = {
  MCQ: "MCQ",
  DRAWING: "DRAWING",
  GRID: "GRID",
  MATCHING: "MATCHING",
  NUMBER: "NUMBER",
  PLACE_ON_IMAGE: "PLACE_ON_IMAGE",
  Q_AND_A: "Q_AND_A",
  RANKING: "RANKING",
  SCALES: "SCALES",
  TEXT: "TEXT",
  ALLOCATION: "ALLOCATION",
  TITLE: "TITLE",
  MEDIA: "MEDIA",
  FOLLOW_UP: "FOLLOW_UP",
} as const satisfies Record<SlideType, SlideType>;

export type Difficulty = McqContent["difficulty"];
export const Difficulty = {
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
  IMPOSSIBLE: "IMPOSSIBLE",
} as const satisfies Record<Difficulty, Difficulty>;

export type ScoreMode = NumberContent["scoreMode"];
export const ScoreMode = {
  EXACT: "EXACT",
  PARTIAL: "PARTIAL",
  RANGE: "RANGE",
  CLOSEST: "CLOSEST",
  INSIDE_RADIUS: "INSIDE_RADIUS",
  NEAREST: "NEAREST",
  DISTANCE: "DISTANCE",
} as const satisfies Record<ScoreMode, ScoreMode>;

export type UserLevel = RegisteredMe["userLevel"];
export const UserLevel = {
  GUEST: "GUEST",
  USER: "USER",
  PREMIUM_USER: "PREMIUM_USER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const satisfies Record<UserLevel, UserLevel>;

export type MembershipTier = RegisteredMe["effectiveTier"];
export const MembershipTier = {
  FREE: "FREE",
  INDIVIDUAL: "INDIVIDUAL",
  ORG_SEAT: "ORG_SEAT",
  ORG_TEAM: "ORG_TEAM",
  ORG_BUSINESS: "ORG_BUSINESS",
} as const satisfies Record<MembershipTier, MembershipTier>;

export type MembershipStatus = RegisteredMe["membershipStatus"];
export const MembershipStatus = {
  ACTIVE: "ACTIVE",
  TRIALING: "TRIALING",
  PAST_DUE: "PAST_DUE",
  CANCELED: "CANCELED",
  EXPIRED: "EXPIRED",
  NONE: "NONE",
} as const satisfies Record<MembershipStatus, MembershipStatus>;
