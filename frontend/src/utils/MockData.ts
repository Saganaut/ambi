/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * LOTR-themed mock data for every core response DTO the backend sends to the
 * frontend. Use these for storybook stories, isolated component dev, unit
 * tests, and bootstrapping a screen before its query is wired up.
 *
 * Conventions:
 *  - Every type is imported from `AmbiApi.ts` so these mocks stay in sync
 *    with codegen — if a field is added or renamed, TypeScript fails here
 *    before it fails in a real consumer.
 *  - For each type we export one canonical instance (e.g. `mockFrodoUser`) and
 *    a small list of LOTR-flavored variants (e.g. `mockUsers`).
 *  - IDs cross-link: `mockFellowshipTriviaDeck.creatorUserId === mockFrodoUser.id`,
 *    `mockFellowshipSession.deckId === mockFellowshipTriviaDeck.id`, etc. This
 *    lets components that read across entities work without further wiring.
 */
import type {
  AllocationQuestion,
  DeckCollectionResponse,
  DeckCommentResponse,
  DeckResponse,
  DrawingQuestion,
  ElementChrome,
  GalleryImageResponse,
  GridQuestion,
  GuestUser,
  Image,
  InteractiveSessionChatMessageResponse,
  InteractiveSessionPlayerResponse,
  InteractiveSessionResponse,
  InteractiveSessionSettings,
  MatchingQuestion,
  McqOption,
  McqQuestion,
  MediaAssetResponse,
  NotificationResponse,
  NumberQuestion,
  OrganizationResponse,
  PlaceOnImageQuestion,
  PlayerStats,
  QAndAQuestion,
  RankingQuestion,
  RegisteredUser,
  ScalesQuestion,
  ScheduledInteractiveSessionResponse,
  Slide,
  TagResponse,
  Team,
  TextQuestion,
  ThemeResponse,
  WordCloudQuestion,
} from "../store/AmbiApi";

// ─── shared primitives ──────────────────────────────────────────────────────

const FELLOWSHIP_FORMED_AT = "3018-12-25T18:00:00Z";
const RECENT = "2026-05-15T09:00:00Z";
const NOW = "2026-05-20T10:00:00Z";

const placeholderImage = (seed: string, w = 800, h = 600): Image => ({
  useExternalImg: true,
  externalUrl: `https://picsum.photos/seed/${seed}/${w}/${h}`,
  blank: false,
  variants: {
    original: {
      url: `https://picsum.photos/seed/${seed}/${w}/${h}`,
      width: w,
      height: h,
    },
    thumb: {
      url: `https://picsum.photos/seed/${seed}/240/180`,
      width: 240,
      height: 180,
    },
  },
});

// ─── McqOption helper ───────────────────────────────────────────────────────

const opt = (id: string, text: string, color?: string): McqOption => ({
  id,
  text,
  color,
});

// ─── PlayerStats ────────────────────────────────────────────────────────────

export const mockFrodoStats: PlayerStats = {
  gamesPlayed: 42,
  highScore: 9870,
  totalPoints: 215430,
  dailyLoginStreak: 7,
};

export const mockGandalfStats: PlayerStats = {
  gamesPlayed: 318,
  highScore: 14200,
  totalPoints: 2_103_500,
  dailyLoginStreak: 21,
};

// ─── Users (RegisteredUser + GuestUser) ─────────────────────────────────────

export const mockFrodoUser: RegisteredUser = {
  id: "u_frodo",
  email: "frodo@baggins.shire",
  name: "Frodo Baggins",
  userName: "RingBearer99",
  isGuest: false,
  externalIdentity: { provider: "google", id: "google_frodo_001" },
  pictureUrl: "https://picsum.photos/seed/frodo/200/200",
  picture: placeholderImage("frodo", 200, 200),
  stats: mockFrodoStats,
  membership: {
    billing: {
      tier: "INDIVIDUAL",
      status: "ACTIVE",
      startedAt: FELLOWSHIP_FORMED_AT,
      currentPeriodEnd: "2026-12-25T00:00:00Z",
      cancelAtPeriodEnd: false,
    },
    monthlyInteractiveSessionCount: 12,
    monthlyCountPeriodStart: "2026-05-01T00:00:00Z",
  },
  newsletter: true,
  organizationIds: ["org_fellowship"],
  activeThemeId: "theme_elven_twilight",
  timezone: "Middle-earth/Shire",
  emailVerifiedAt: FELLOWSHIP_FORMED_AT,
  lastLogin: RECENT,
  createdAt: FELLOWSHIP_FORMED_AT,
};

export const mockGandalfUser: RegisteredUser = {
  id: "u_gandalf",
  email: "mithrandir@valinor.aman",
  name: "Gandalf the Grey",
  userName: "Mithrandir",
  isGuest: false,
  externalIdentity: { provider: "google", id: "google_gandalf_001" },
  pictureUrl: "https://picsum.photos/seed/gandalf/200/200",
  picture: placeholderImage("gandalf", 200, 200),
  stats: mockGandalfStats,
  membership: {
    billing: {
      tier: "ORG_BUSINESS",
      status: "ACTIVE",
      startedAt: "1019-01-01T00:00:00Z",
      currentPeriodEnd: "9999-12-31T00:00:00Z",
      cancelAtPeriodEnd: false,
    },
    sourceOrganizationId: "org_white_council",
    monthlyInteractiveSessionCount: 73,
    monthlyCountPeriodStart: "2026-05-01T00:00:00Z",
  },
  newsletter: false,
  organizationIds: ["org_white_council", "org_fellowship"],
  activeThemeId: "theme_wizards_counsel",
  timezone: "Middle-earth/Rivendell",
  emailVerifiedAt: "1019-01-01T00:00:00Z",
  lastLogin: NOW,
  createdAt: "1019-01-01T00:00:00Z",
};

export const mockAragornUser: RegisteredUser = {
  id: "u_aragorn",
  email: "strider@dunedain.eriador",
  name: "Aragorn II Elessar",
  userName: "Strider",
  isGuest: false,
  pictureUrl: "https://picsum.photos/seed/aragorn/200/200",
  picture: placeholderImage("aragorn", 200, 200),
  stats: {
    gamesPlayed: 87,
    highScore: 11500,
    totalPoints: 542000,
    dailyLoginStreak: 3,
  },
  membership: {
    billing: { tier: "INDIVIDUAL", status: "ACTIVE", cancelAtPeriodEnd: false },
  },
  newsletter: true,
  organizationIds: ["org_fellowship"],
  activeThemeId: "theme_plains_of_rohan",
  timezone: "Middle-earth/Gondor",
  emailVerifiedAt: FELLOWSHIP_FORMED_AT,
  lastLogin: RECENT,
  createdAt: "2990-03-01T00:00:00Z",
};

export const mockSamUser: RegisteredUser = {
  id: "u_sam",
  email: "sam@gamgee.shire",
  name: "Samwise Gamgee",
  userName: "GardenerOfTheYear",
  isGuest: false,
  pictureUrl: "https://picsum.photos/seed/sam/200/200",
  picture: placeholderImage("sam", 200, 200),
  stats: {
    gamesPlayed: 41,
    highScore: 9100,
    totalPoints: 203000,
    dailyLoginStreak: 6,
  },
  membership: {
    billing: { tier: "FREE", status: "ACTIVE", cancelAtPeriodEnd: false },
  },
  newsletter: true,
  organizationIds: ["org_fellowship"],
  activeThemeId: "theme_shire_morning",
  timezone: "Middle-earth/Shire",
  lastLogin: RECENT,
  createdAt: FELLOWSHIP_FORMED_AT,
};

export const mockLegolasGuest: GuestUser = {
  id: "u_guest_legolas",
  userName: "PrinceOfMirkwood",
  isGuest: true,
  pictureUrl: "https://picsum.photos/seed/legolas/200/200",
  picture: placeholderImage("legolas", 200, 200),
  stats: {
    gamesPlayed: 4,
    highScore: 6200,
    totalPoints: 18400,
    dailyLoginStreak: 2,
  },
};

export const mockGimliGuest: GuestUser = {
  id: "u_guest_gimli",
  userName: "AxeMaster",
  isGuest: true,
  pictureUrl: "https://picsum.photos/seed/gimli/200/200",
  picture: placeholderImage("gimli", 200, 200),
  stats: {
    gamesPlayed: 5,
    highScore: 5800,
    totalPoints: 17200,
    dailyLoginStreak: 1,
  },
};

export const mockUsers: RegisteredUser[] = [
  mockFrodoUser,
  mockGandalfUser,
  mockAragornUser,
  mockSamUser,
];

export const mockGuestUsers: GuestUser[] = [mockLegolasGuest, mockGimliGuest];

// `GET /api/leaderboard` returns `GuestUser[]` (the structural subset shared
// by guests + registered players for podium display).
export const mockLeaderboard: GuestUser[] = [
  {
    id: mockGandalfUser.id,
    userName: mockGandalfUser.userName,
    isGuest: false,
    pictureUrl: mockGandalfUser.pictureUrl,
    stats: mockGandalfStats,
  },
  {
    id: mockAragornUser.id,
    userName: mockAragornUser.userName,
    isGuest: false,
    pictureUrl: mockAragornUser.pictureUrl,
    stats: mockAragornUser.stats,
  },
  {
    id: mockFrodoUser.id,
    userName: mockFrodoUser.userName,
    isGuest: false,
    pictureUrl: mockFrodoUser.pictureUrl,
    stats: mockFrodoStats,
  },
  {
    id: mockSamUser.id,
    userName: mockSamUser.userName,
    isGuest: false,
    pictureUrl: mockSamUser.pictureUrl,
    stats: mockSamUser.stats,
  },
  mockLegolasGuest,
  mockGimliGuest,
];

// ─── Themes ─────────────────────────────────────────────────────────────────

export const mockElvenTwilightTheme: ThemeResponse = {
  id: "theme_elven_twilight",
  name: "Elven Twilight",
  ownerId: mockFrodoUser.id,
  organizationId: "org_fellowship",
  huePrimary: 230,
  hueAccent: 100,
  mode: "DARK",
  background: placeholderImage("rivendell-bg", 1920, 1080),
  logo: placeholderImage("evenstar-logo", 256, 256),
  createdAt: FELLOWSHIP_FORMED_AT,
};

export const mockWizardsCounselTheme: ThemeResponse = {
  id: "theme_wizards_counsel",
  name: "Wizard's Counsel",
  ownerId: mockGandalfUser.id,
  organizationId: "org_white_council",
  huePrimary: 270,
  hueAccent: 50,
  mode: "LIGHT",
  background: placeholderImage("isengard-bg", 1920, 1080),
  logo: placeholderImage("staff-logo", 256, 256),
  createdAt: "1019-01-01T00:00:00Z",
};

export const mockShireMorningTheme: ThemeResponse = {
  id: "theme_shire_morning",
  name: "Shire Morning",
  ownerId: mockSamUser.id,
  huePrimary: 95,
  hueAccent: 30,
  mode: "LIGHT",
  background: placeholderImage("shire-bg", 1920, 1080),
  logo: placeholderImage("green-dragon-logo", 256, 256),
  createdAt: FELLOWSHIP_FORMED_AT,
};

export const mockPlainsOfRohanTheme: ThemeResponse = {
  id: "theme_plains_of_rohan",
  name: "Plains of Rohan",
  ownerId: mockAragornUser.id,
  huePrimary: 35,
  hueAccent: 145,
  mode: "LIGHT",
  background: placeholderImage("rohan-bg", 1920, 1080),
  logo: placeholderImage("white-horse-logo", 256, 256),
  createdAt: FELLOWSHIP_FORMED_AT,
};

export const mockThemes: ThemeResponse[] = [
  mockElvenTwilightTheme,
  mockWizardsCounselTheme,
  mockShireMorningTheme,
  mockPlainsOfRohanTheme,
];

// ─── Tags ───────────────────────────────────────────────────────────────────

export const mockLotrTag: TagResponse = {
  id: "tag_lotr",
  displayName: "Lord of the Rings",
  description: "All things Middle-earth.",
  iconUrl: "https://picsum.photos/seed/tag-lotr/64/64",
  deckCount: 12,
  curated: true,
  createdAt: FELLOWSHIP_FORMED_AT,
  updatedAt: RECENT,
  children: [
    {
      id: "tag_fellowship",
      displayName: "Fellowship",
      parentTagId: "tag_lotr",
      description: "Trivia about the nine walkers.",
      deckCount: 4,
      curated: true,
      createdAt: FELLOWSHIP_FORMED_AT,
      updatedAt: RECENT,
    },
    {
      id: "tag_lore",
      displayName: "Lore",
      parentTagId: "tag_lotr",
      description: "Deep cuts and First Age content.",
      deckCount: 5,
      curated: true,
      createdAt: FELLOWSHIP_FORMED_AT,
      updatedAt: RECENT,
    },
    {
      id: "tag_hobbits",
      displayName: "Hobbits",
      parentTagId: "tag_lotr",
      description: "Hobbit-centric polls and pulses.",
      deckCount: 3,
      curated: true,
      createdAt: FELLOWSHIP_FORMED_AT,
      updatedAt: RECENT,
    },
  ],
};

export const mockTriviaTag: TagResponse = {
  id: "tag_trivia",
  displayName: "Trivia",
  description: "Score-based question decks.",
  deckCount: 87,
  curated: true,
  createdAt: FELLOWSHIP_FORMED_AT,
  updatedAt: RECENT,
};

export const mockTags: TagResponse[] = [mockLotrTag, mockTriviaTag];

// ─── Organizations ──────────────────────────────────────────────────────────

export const mockFellowshipOrg: OrganizationResponse = {
  id: "org_fellowship",
  name: "Fellowship of the Ring",
  ownerId: mockAragornUser.id,
  plan: {
    tier: "ORG_TEAM",
    status: "ACTIVE",
    seatLimit: 9,
    startedAt: FELLOWSHIP_FORMED_AT,
    currentPeriodEnd: "2026-12-25T00:00:00Z",
    cancelAtPeriodEnd: false,
  },
  createdAt: FELLOWSHIP_FORMED_AT,
};

export const mockWhiteCouncilOrg: OrganizationResponse = {
  id: "org_white_council",
  name: "The White Council",
  ownerId: mockGandalfUser.id,
  plan: {
    tier: "ORG_BUSINESS",
    status: "ACTIVE",
    seatLimit: 50,
    startedAt: "1019-01-01T00:00:00Z",
    currentPeriodEnd: "9999-12-31T00:00:00Z",
    cancelAtPeriodEnd: false,
  },
  createdAt: "1019-01-01T00:00:00Z",
};

export const mockOrganizations: OrganizationResponse[] = [
  mockFellowshipOrg,
  mockWhiteCouncilOrg,
];

// ─── Media + gallery ────────────────────────────────────────────────────────

export const mockMintGandalfMedia: MediaAssetResponse = {
  id: "media_gandalf_arrives",
  kind: "IMAGE",
  name: "Gandalf arrives at Bag End",
  ownerId: mockFrodoUser.id,
  organizationId: mockFellowshipOrg.id,
  variants: {
    original: {
      url: "https://picsum.photos/seed/bag-end/1600/900",
      width: 1600,
      height: 900,
    },
    thumb: {
      url: "https://picsum.photos/seed/bag-end/320/180",
      width: 320,
      height: 180,
    },
  },
  url: "https://picsum.photos/seed/bag-end/1600/900",
  sizeBytes: 482_310,
  width: 1600,
  height: 900,
  mimeType: "image/jpeg",
  altText: "A grey wizard at the round green door of Bag End.",
  attribution: "Concept art",
  sourceUrl: "https://example.test/bag-end.jpg",
  tags: ["shire", "gandalf", "bag-end"],
  createdAt: RECENT,
};

export const mockBalrogClipMedia: MediaAssetResponse = {
  id: "media_balrog_clip",
  kind: "VIDEO_EMBED",
  name: "You shall not pass — embed",
  ownerId: mockGandalfUser.id,
  organizationId: mockWhiteCouncilOrg.id,
  url: "https://example.test/embed/you-shall-not-pass",
  sourceUrl: "https://example.test/embed/you-shall-not-pass",
  durationMs: 87_000,
  mimeType: "video/embed",
  altText: "Gandalf vs. Balrog on the Bridge of Khazad-dûm.",
  attribution: "Embed",
  tags: ["moria", "gandalf", "balrog"],
  createdAt: RECENT,
};

export const mockMediaAssets: MediaAssetResponse[] = [
  mockMintGandalfMedia,
  mockBalrogClipMedia,
];

export const mockGalleryImage: GalleryImageResponse = {
  id: "gallery_evenstar",
  name: "Evenstar",
  ownerId: mockAragornUser.id,
  organizationId: mockFellowshipOrg.id,
  tags: ["arwen", "evenstar", "jewel"],
  variants: {
    original: {
      url: "https://picsum.photos/seed/evenstar/1200/1200",
      width: 1200,
      height: 1200,
    },
    thumb: {
      url: "https://picsum.photos/seed/evenstar/240/240",
      width: 240,
      height: 240,
    },
  },
  createdAt: FELLOWSHIP_FORMED_AT,
};

export const mockGalleryImages: GalleryImageResponse[] = [
  mockGalleryImage,
  {
    id: "gallery_anduril",
    name: "Andúril, Flame of the West",
    ownerId: mockAragornUser.id,
    tags: ["sword", "narsil", "reforged"],
    variants: {
      original: {
        url: "https://picsum.photos/seed/anduril/1600/900",
        width: 1600,
        height: 900,
      },
      thumb: {
        url: "https://picsum.photos/seed/anduril/240/135",
        width: 240,
        height: 135,
      },
    },
    createdAt: FELLOWSHIP_FORMED_AT,
  },
];

// ─── DeckElement subtypes ───────────────────────────────────────────────────

// Build an ElementChrome with the same audit / reactions defaults used across
// every mock element. Caller supplies id + title + the small set of fields
// that vary by element (scored / survey, displaySeconds, mediaPosition,
// optional background image, optional bestAnswer overrides).
const chromeFor = (
  id: string,
  title: string,
  opts: {
    scored?: boolean;
    survey?: boolean;
    multipleSelections?: number | null;
    displaySeconds?: number;
    mediaPosition?: ElementChrome["mediaPosition"];
    background?: Image;
    bestAnswerMode?: boolean;
    bestAnswerScoring?: ElementChrome["bestAnswerScoring"];
  } = {},
): ElementChrome => ({
  publicKey: `pub_${id}`,
  privateKey: `prv_${id}`,
  title,
  scored: opts.scored ?? true,
  survey: opts.survey ?? false,
  multipleSelections: opts.multipleSelections ?? undefined,
  responseMode: "ACCEPTING_RESPONSES",
  displaySeconds: opts.displaySeconds ?? 30,
  mediaPosition: opts.mediaPosition ?? "NONE",
  background: opts.background,
  bestAnswerMode: opts.bestAnswerMode ?? false,
  bestAnswerPoints: 0,
  bestAnswerScoring: opts.bestAnswerScoring ?? "POINTS_PER_VOTE",
  createdByUserId: mockFrodoUser.id,
  lastEditedByUserId: mockFrodoUser.id,
  createdAt: FELLOWSHIP_FORMED_AT,
  updatedAt: RECENT,
  tagIds: ["tag_lotr", "tag_fellowship"],
  mediaCaption: "",
  altText: "",
  reactionsEnabled: true,
  version: 1,
});

export const mockMcqQuestion: McqQuestion = {
  kind: "McqQuestion",
  id: "el_mcq_ring_bearer",
  prompt: "Who carried the One Ring from the Shire to Mount Doom?",
  options: [
    opt("opt_aragorn", "Aragorn", "var(--red-500)"),
    opt("opt_frodo", "Frodo Baggins", "var(--blue-500)"),
    opt("opt_sam", "Samwise Gamgee", "var(--green-500)"),
    opt("opt_boromir", "Boromir", "var(--yellow-500)"),
  ],
  correctOptionIds: ["opt_frodo"],
  pointValue: 100,
  difficulty: "EASY",
  explanation:
    "Frodo bore the Ring the whole journey — Sam carried it briefly in Cirith Ungol.",
  shuffleOptions: true,
  allowMultipleSelect: false,
  maxSelections: 1,
  chrome: chromeFor("mcq_ring_bearer", "The Ring Bearer", {
    displaySeconds: 20,
  }),
};

export const mockNumberQuestion: NumberQuestion = {
  kind: "NumberQuestion",
  id: "el_num_fellowship_count",
  prompt: "How many members were there in the Fellowship of the Ring?",
  correctValue: 9,
  tolerance: 0,
  unitLabel: " members",
  decimalPlaces: 0,
  pointValue: 150,
  difficulty: "EASY",
  explanation: "Four hobbits, two men, an elf, a dwarf, and a wizard.",
  minValue: 0,
  maxValue: 99,
  allowNegative: false,
  chrome: chromeFor("num_fellowship_count", "Nine Walkers", {
    displaySeconds: 15,
  }),
};

export const mockTextQuestion: TextQuestion = {
  kind: "TextQuestion",
  id: "el_text_anduril",
  prompt:
    "What is the name of Aragorn's sword, reforged from the shards of Narsil?",
  correctAnswer: "Andúril",
  acceptedVariants: ["Anduril", "Flame of the West"],
  caseSensitive: false,
  pointValue: 200,
  difficulty: "MEDIUM",
  maxLength: 60,
  trimWhitespace: true,
  fuzzyMatch: true,
  fuzzyDistance: 2,
  chrome: chromeFor("text_anduril", "Reforged in Rivendell", {
    displaySeconds: 25,
  }),
};

export const mockGridQuestion: GridQuestion = {
  kind: "GridQuestion",
  id: "el_grid_moria",
  prompt: "Tap the tile showing the Doors of Durin.",
  rows: 2,
  cols: 3,
  cells: {
    labels: [
      "Bag End",
      "Bree",
      "Doors of Durin",
      "Helm's Deep",
      "Minas Tirith",
      "Mount Doom",
    ],
    backingImage: placeholderImage("moria-grid", 900, 600),
  },
  correctCellIndexes: [2],
  multipleCorrect: false,
  pointValue: 175,
  difficulty: "MEDIUM",
  chrome: chromeFor("grid_moria", "Mines of Moria", {
    displaySeconds: 20,
    mediaPosition: "TOP",
  }),
};

export const mockMatchingQuestion: MatchingQuestion = {
  kind: "MatchingQuestion",
  id: "el_matching_swords",
  prompt: "Match each weapon to the one who wields it.",
  pairs: [
    { id: "pair_anduril", leftLabel: "Andúril", rightLabel: "Aragorn" },
    { id: "pair_sting", leftLabel: "Sting", rightLabel: "Frodo Baggins" },
    { id: "pair_glamdring", leftLabel: "Glamdring", rightLabel: "Gandalf" },
    { id: "pair_axe", leftLabel: "Walking-axe", rightLabel: "Gimli" },
  ],
  scoring: "PARTIAL",
  pointValue: 200,
  difficulty: "MEDIUM",
  chrome: chromeFor("matching_swords", "Blade-bearers", { displaySeconds: 35 }),
};

export const mockAllocationQuestion: AllocationQuestion = {
  kind: "AllocationQuestion",
  id: "el_alloc_lembas",
  prompt: "Distribute 12 lembas wafers among the Fellowship.",
  options: [
    opt("alloc_frodo", "Frodo"),
    opt("alloc_sam", "Sam"),
    opt("alloc_pippin", "Pippin"),
    opt("alloc_merry", "Merry"),
  ],
  totalPointsToDistribute: 12,
  allowZeroOnItem: true,
  enforceExactTotal: true,
  pointValue: 100,
  difficulty: "MEDIUM",
  chrome: chromeFor("alloc_lembas", "Ration the Lembas", {
    scored: false,
    survey: true,
    displaySeconds: 45,
  }),
};

export const mockDrawingQuestion: DrawingQuestion = {
  kind: "DrawingQuestion",
  id: "el_draw_map_of_mordor",
  prompt: "From memory, sketch the path from the Black Gate to Mount Doom.",
  backingImage: placeholderImage("mordor-map", 1200, 800),
  canvasWidth: 1200,
  canvasHeight: 800,
  maxStrokesPerPlayer: 30,
  maxPointsPerStroke: 200,
  palette: ["#1c1c1c", "#b22222", "#d4a017", "#2e8b57"],
  pointValue: 0,
  difficulty: "HARD",
  chrome: chromeFor("draw_map_of_mordor", "Sketch Mordor", {
    scored: false,
    survey: true,
    displaySeconds: 90,
    mediaPosition: "BACKGROUND",
    bestAnswerScoring: "FLAT_WINNER",
  }),
};

export const mockPlaceOnImageQuestion: PlaceOnImageQuestion = {
  kind: "PlaceOnImageQuestion",
  id: "el_place_minas_tirith",
  prompt: "Tap where Minas Tirith stands on the map of Middle-earth.",
  targetImage: placeholderImage("middle-earth-map", 1600, 1200),
  correctX: 0.62,
  correctY: 0.58,
  tolerance: 0.04,
  scoring: "LINEAR",
  pointValue: 200,
  difficulty: "MEDIUM",
  chrome: chromeFor("place_minas_tirith", "Find Minas Tirith", {
    displaySeconds: 25,
    mediaPosition: "TOP",
  }),
};

export const mockQAndAQuestion: QAndAQuestion = {
  kind: "QAndAQuestion",
  id: "el_qanda_hobbit_hot_takes",
  prompt: "Submit your strongest opinion about hobbit cuisine.",
  maxSubmissionsPerPlayer: 3,
  allowVoting: true,
  autoApprove: false,
  pointValue: 0,
  difficulty: "EASY",
  anonymousSubmissions: false,
  minVotesToShow: 1,
  chrome: chromeFor("qanda_hobbit_hot_takes", "Hobbit Hot Takes", {
    scored: false,
    survey: true,
    displaySeconds: 45,
  }),
};

export const mockRankingQuestion: RankingQuestion = {
  kind: "RankingQuestion",
  id: "el_rank_ages",
  prompt: "Drag these Ages into chronological order, earliest first.",
  items: [
    { id: "rank_first", label: "First Age" },
    { id: "rank_second", label: "Second Age" },
    { id: "rank_third", label: "Third Age" },
    { id: "rank_fourth", label: "Fourth Age" },
  ],
  correctOrder: ["rank_first", "rank_second", "rank_third", "rank_fourth"],
  scoring: "PARTIAL",
  pointValue: 200,
  difficulty: "MEDIUM",
  shuffleItemsForPresentation: true,
  chrome: chromeFor("rank_ages", "Ages of Middle-earth", {
    displaySeconds: 40,
  }),
};

export const mockScalesQuestion: ScalesQuestion = {
  kind: "ScalesQuestion",
  id: "el_scales_meals",
  prompt: "Rate how essential each meal is to a proper hobbit day.",
  statements: [
    { id: "meal_breakfast", text: "Breakfast" },
    { id: "meal_second", text: "Second breakfast" },
    { id: "meal_elevenses", text: "Elevenses" },
    { id: "meal_luncheon", text: "Luncheon" },
    { id: "meal_tea", text: "Afternoon tea" },
    { id: "meal_supper", text: "Supper" },
  ],
  scaleMin: 1,
  scaleMax: 5,
  minLabel: "Skip it",
  maxLabel: "Sacred",
  correctRatings: [],
  pointValue: 0,
  difficulty: "EASY",
  chrome: chromeFor("scales_meals", "Hobbit Mealtimes", {
    scored: false,
    survey: true,
    displaySeconds: 30,
  }),
};

export const mockWordCloudQuestion: WordCloudQuestion = {
  kind: "WordCloudQuestion",
  id: "el_word_one_word_gandalf",
  prompt: "Describe Gandalf the Grey in a single word.",
  maxSubmissionsPerPlayer: 1,
  maxWordLength: 24,
  caseSensitive: false,
  profanityFilter: true,
  bannedWords: ["fool"],
  pointValue: 0,
  difficulty: "EASY",
  chrome: chromeFor("word_one_word_gandalf", "Gandalf in a word", {
    scored: false,
    survey: true,
    displaySeconds: 30,
  }),
};

export const mockTitleSlide: Slide = {
  kind: "Slide",
  id: "el_slide_title",
  slideKind: "TITLE",
  body: "Nine walkers set out from Rivendell. How well do you know them?",
  blocks: [],
  joinType: "QR_CODE",
  showJoinInformation: true,
  showQrCode: true,
  showResponses: "INHERIT",
  autoAdvanceSeconds: 0,
  chrome: chromeFor("slide_title", "Fellowship Trivia", {
    scored: false,
    survey: false,
    displaySeconds: 0,
    mediaPosition: "BACKGROUND",
    background: placeholderImage("title-rivendell", 1920, 1080),
  }),
};

export const mockEndSlide: Slide = {
  kind: "Slide",
  id: "el_slide_end",
  slideKind: "END",
  body: "Even the smallest person can change the course of the future.",
  blocks: [],
  chrome: {
    ...chromeFor("slide_end", "Well done, traveller.", {
      scored: false,
      survey: false,
      displaySeconds: 0,
      mediaPosition: "BACKGROUND",
      background: placeholderImage("end-shire", 1920, 1080),
    }),
    responseMode: "NOT_ACCEPTING_RESPONSES",
  },
};

// One of each element kind, in a natural deck order — handy for editor demos.
export const mockAllElements = [
  mockTitleSlide,
  mockMcqQuestion,
  mockNumberQuestion,
  mockTextQuestion,
  mockGridQuestion,
  mockMatchingQuestion,
  mockPlaceOnImageQuestion,
  mockRankingQuestion,
  mockScalesQuestion,
  mockAllocationQuestion,
  mockDrawingQuestion,
  mockQAndAQuestion,
  mockWordCloudQuestion,
  mockEndSlide,
] as const;

// ─── InteractiveSessionSettings ─────────────────────────────────────────────

export const mockSessionSettings: InteractiveSessionSettings = {
  maxPlayers: 50,
  timePerQuestion: 30,
  speedBonus: true,
  allowGuests: true,
  showResponses: "ON_CLICK",
  allowLateJoin: true,
  showScoresImmediately: true,
  scoringEnabled: true,
  reactionsEnabled: true,
  chatEnabled: true,
  teamMode: false,
  teamCount: 2,
  autoBalanceTeams: false,
  shuffleQuestions: false,
  shuffleAnswers: true,
  autoAdvance: false,
  podiumDuration: 10,
  lobbyCountdownSeconds: 5,
  lobbyMusicAssetId: undefined,
  spectatorsAllowed: true,
  answerSubmissionMode: "SIMULTANEOUS",
  anonymousMode: false,
  allowReJoin: true,
};

export const mockTeamSessionSettings: InteractiveSessionSettings = {
  ...mockSessionSettings,
  teamMode: true,
  teamCount: 2,
  autoBalanceTeams: true,
};

// ─── Decks ──────────────────────────────────────────────────────────────────

export const mockFellowshipTriviaDeck: DeckResponse = {
  id: "deck_fellowship_trivia",
  name: "Fellowship Trivia",
  description:
    "A grab-bag of trivia about the nine walkers, from Bag End to Mount Doom.",
  creatorUserId: mockFrodoUser.id,
  organizationId: mockFellowshipOrg.id,
  tags: ["lotr", "trivia", "fellowship"],
  tagIds: ["tag_lotr", "tag_fellowship", "tag_trivia"],
  subjectTagId: "tag_lotr",
  isSystem: false,
  visibility: "PUBLIC",
  defaultSessionFormat: "GAME",
  defaultShowResponses: "ON_CLICK",
  cover: placeholderImage("fellowship-cover", 1200, 800),
  background: placeholderImage("fellowship-bg", 1920, 1080),
  themeId: mockElvenTwilightTheme.id,
  defaultSettings: mockSessionSettings,
  estimatedDurationMinutes: 7,
  elementCount: 5,
  elements: [
    mockTitleSlide,
    mockMcqQuestion,
    mockNumberQuestion,
    mockTextQuestion,
    mockEndSlide,
  ],
  publishStatus: "PUBLISHED",
  publishedAt: FELLOWSHIP_FORMED_AT,
  language: "en",
  difficulty: "EASY",
  ageRange: "10+",
  license: "CC_BY",
  playCount: 1289,
  viewCount: 4321,
  favoriteCount: 87,
  isFavorited: false,
  averageRating: 4.7,
  ratingCount: 23,
  myRating: 0,
  isRatedByMe: false,
  myRole: "OWNER",
  lastPlayedAt: RECENT,
  createdAt: FELLOWSHIP_FORMED_AT,
  updatedAt: RECENT,
};

export const mockSecondBreakfastDeck: DeckResponse = {
  id: "deck_second_breakfast",
  name: "Second Breakfast",
  description: "A Pulse-style poll deck — no scoring, just hobbit hot takes.",
  creatorUserId: mockSamUser.id,
  organizationId: mockFellowshipOrg.id,
  tags: ["lotr", "pulse", "hobbits"],
  tagIds: ["tag_lotr", "tag_hobbits"],
  subjectTagId: "tag_lotr",
  isSystem: false,
  visibility: "PUBLIC",
  defaultSessionFormat: "PRESENTATION",
  defaultShowResponses: "INSTANT",
  cover: placeholderImage("second-breakfast-cover", 1200, 800),
  themeId: mockShireMorningTheme.id,
  defaultSettings: {
    ...mockSessionSettings,
    scoringEnabled: false,
  },
  estimatedDurationMinutes: 4,
  elementCount: 4,
  elements: [
    {
      ...mockTitleSlide,
      id: "el_slide_sb_title",
      body: "All polls. No wrong answers.",

      chrome: { ...mockTitleSlide.chrome!, title: "Second Breakfast" },
    },
    mockScalesQuestion,
    mockQAndAQuestion,
    {
      ...mockEndSlide,
      id: "el_slide_sb_end",
      body: "PO-TA-TOES.",
      chrome: { ...mockEndSlide.chrome!, title: "Mind your taters." },
    },
  ],
  publishStatus: "PUBLISHED",
  publishedAt: FELLOWSHIP_FORMED_AT,
  language: "en",
  difficulty: "EASY",
  ageRange: "All ages",
  license: "CC_BY",
  playCount: 540,
  viewCount: 1920,
  favoriteCount: 41,
  isFavorited: true,
  averageRating: 4.4,
  ratingCount: 11,
  myRating: 5,
  isRatedByMe: true,
  myRole: "EDITOR",
  createdAt: FELLOWSHIP_FORMED_AT,
  updatedAt: RECENT,
};

export const mockAncientLoreDeck: DeckResponse = {
  id: "deck_ancient_lore",
  name: "Ancient Lore",
  description:
    "For wizards, lore-masters, and anyone who reads the appendices.",
  creatorUserId: mockGandalfUser.id,
  organizationId: mockWhiteCouncilOrg.id,
  tags: ["lotr", "lore", "advanced"],
  tagIds: ["tag_lotr", "tag_lore", "tag_trivia"],
  subjectTagId: "tag_lotr",
  isSystem: false,
  visibility: "ORG",
  defaultSessionFormat: "GAME",
  defaultShowResponses: "ON_CLICK",
  cover: placeholderImage("ancient-lore-cover", 1200, 800),
  themeId: mockWizardsCounselTheme.id,
  defaultSettings: mockSessionSettings,
  estimatedDurationMinutes: 8,
  elementCount: 4,
  elements: [
    {
      ...mockMcqQuestion,
      id: "el_mcq_nenya",
      prompt: "Which ring of power was held by Galadriel?",
      options: [
        opt("nenya_narya", "Narya"),
        opt("nenya_nenya", "Nenya"),
        opt("nenya_vilya", "Vilya"),
        opt("nenya_one", "The One Ring"),
      ],
      correctOptionIds: ["nenya_nenya"],
      difficulty: "HARD",
      pointValue: 200,
      chrome: { ...mockMcqQuestion.chrome!, title: "Galadriel's Ring" },
    },
    {
      ...mockTextQuestion,
      id: "el_text_celebrimbor",
      prompt: "Who forged the Rings of Power?",
      correctAnswer: "Celebrimbor",
      acceptedVariants: [],
      difficulty: "HARD",
      pointValue: 250,
      chrome: { ...mockTextQuestion.chrome!, title: "Smith of Eregion" },
    },
    mockRankingQuestion,
    mockEndSlide,
  ],
  publishStatus: "PUBLISHED",
  publishedAt: FELLOWSHIP_FORMED_AT,
  language: "en",
  difficulty: "HARD",
  ageRange: "13+",
  license: "ALL_RIGHTS_RESERVED",
  playCount: 142,
  viewCount: 612,
  favoriteCount: 19,
  isFavorited: false,
  averageRating: 4.9,
  ratingCount: 7,
  myRating: 0,
  isRatedByMe: false,
  myRole: "VIEWER",
  createdAt: FELLOWSHIP_FORMED_AT,
  updatedAt: RECENT,
};

export const mockDecks: DeckResponse[] = [
  mockFellowshipTriviaDeck,
  mockSecondBreakfastDeck,
  mockAncientLoreDeck,
];

// ─── DeckCollection ─────────────────────────────────────────────────────────

export const mockMiddleEarthCollection: DeckCollectionResponse = {
  id: "collection_middle_earth",
  ownerUserId: mockGandalfUser.id,
  organizationId: mockWhiteCouncilOrg.id,
  name: "A Middle-earth Journey",
  description: "Three decks. From the Shire, through Moria, to the Black Gate.",
  cover: placeholderImage("middle-earth-collection", 1200, 800),
  deckIds: mockDecks.map((d) => d.id!).filter(Boolean),
  visibility: "PUBLIC",
  viewCount: 870,
  deckCount: mockDecks.length,
  decks: mockDecks,
  createdAt: FELLOWSHIP_FORMED_AT,
  updatedAt: RECENT,
};

// ─── Comments ───────────────────────────────────────────────────────────────

export const mockDeckComment: DeckCommentResponse = {
  id: "comment_one",
  deckId: mockFellowshipTriviaDeck.id,
  author: {
    userId: mockSamUser.id,
    name: mockSamUser.name,
    pictureUrl: mockSamUser.pictureUrl,
  },
  body: "Brilliant deck, Mr. Frodo. The taters slide hits home.",
  upvotes: 7,
  upvotedByMe: true,
  edited: false,
  deleted: false,
  replyCount: 1,
  createdAt: RECENT,
  updatedAt: RECENT,
};

export const mockDeckCommentReply: DeckCommentResponse = {
  id: "comment_two",
  deckId: mockFellowshipTriviaDeck.id,
  author: {
    userId: mockFrodoUser.id,
    name: mockFrodoUser.name,
    pictureUrl: mockFrodoUser.pictureUrl,
  },
  parentCommentId: "comment_one",
  body: "Thanks, Sam. Couldn't have made it without you.",
  upvotes: 12,
  upvotedByMe: false,
  edited: true,
  deleted: false,
  replyCount: 0,
  createdAt: RECENT,
  updatedAt: RECENT,
};

export const mockDeckComments: DeckCommentResponse[] = [
  mockDeckComment,
  mockDeckCommentReply,
];

// ─── Interactive sessions ───────────────────────────────────────────────────

// Stable session-scoped playerIds for mock data. In production these are UUIDs
// minted on first join; mocks alias them to a "player-<role>" form so tests and
// design-system fixtures stay readable.
const mockFrodoPlayerId = "player-frodo";
const mockSamPlayerId = "player-sam";
const mockLegolasPlayerId = "player-legolas";
const mockGimliPlayerId = "player-gimli";
const mockAragornPlayerId = "player-aragorn";

export const mockFellowshipPlayers: InteractiveSessionPlayerResponse[] = [
  {
    playerId: mockFrodoPlayerId,
    user: {
      name: mockFrodoUser.userName,
      pictureUrl: mockFrodoUser.pictureUrl,
      guest: false,
    },
    score: 1450,
    avatar: { avatarType: "KEY", avatarKey: "frodo" },
    colorTag: "var(--blue-500)",
    currentStreak: 3,
    longestStreak: 5,
    accuracy: 0.82,
    reactionsSent: 4,
    speedBonusTotal: 220,
    lateJoin: false,
    disconnected: false,
    lastSeenAt: NOW,
  },
  {
    playerId: mockSamPlayerId,
    user: {
      name: mockSamUser.userName,
      pictureUrl: mockSamUser.pictureUrl,
      guest: false,
    },
    score: 1320,
    avatar: { avatarType: "KEY", avatarKey: "sam" },
    colorTag: "var(--green-500)",
    currentStreak: 2,
    longestStreak: 4,
    accuracy: 0.78,
    reactionsSent: 9,
    speedBonusTotal: 180,
    lateJoin: false,
    disconnected: false,
    lastSeenAt: NOW,
  },
  {
    playerId: mockLegolasPlayerId,
    user: {
      name: mockLegolasGuest.userName,
      pictureUrl: mockLegolasGuest.pictureUrl,
      guest: true,
    },
    score: 1200,
    avatar: { avatarType: "KEY", avatarKey: "legolas" },
    colorTag: "var(--yellow-500)",
    currentStreak: 1,
    longestStreak: 3,
    accuracy: 0.71,
    reactionsSent: 2,
    speedBonusTotal: 120,
    lateJoin: true,
    disconnected: false,
    lastSeenAt: NOW,
  },
  {
    playerId: mockGimliPlayerId,
    user: {
      name: mockGimliGuest.userName,
      pictureUrl: mockGimliGuest.pictureUrl,
      guest: true,
    },
    score: 980,
    avatar: { avatarType: "KEY", avatarKey: "gimli" },
    colorTag: "var(--red-500)",
    currentStreak: 0,
    longestStreak: 2,
    accuracy: 0.64,
    reactionsSent: 11,
    speedBonusTotal: 60,
    lateJoin: false,
    disconnected: false,
    lastSeenAt: NOW,
  },
];

// Seed audience-chat history for the Fellowship session, newest-last to match
// how SessionChat renders its scroll area. Authors line up with
// `mockFellowshipPlayers` (same playerIds + display names); Frodo is the host
// and the viewer, so his line carries `fromHost` and renders as the viewer's
// own message. Exists so the Gen-2 SessionChat widget has something live to
// show while the board runs on mock data (no STOMP /chat socket yet).
export const mockFellowshipChat: InteractiveSessionChatMessageResponse[] = [
  {
    id: "chat_fellowship_1",
    authorPlayerId: mockSamPlayerId,
    author: { name: mockSamUser.userName, guest: false },
    fromHost: false,
    body: "Good luck everyone — for the Shire!",
    sentAt: "2026-05-20T09:55:00Z",
    moderated: false,
  },
  {
    id: "chat_fellowship_2",
    authorPlayerId: mockLegolasPlayerId,
    author: { name: mockLegolasGuest.userName, guest: true },
    fromHost: false,
    body: "That last question was tricky 😅",
    sentAt: "2026-05-20T09:57:30Z",
    moderated: false,
  },
  {
    id: "chat_fellowship_3",
    authorPlayerId: mockGimliPlayerId,
    author: { name: mockGimliGuest.userName, guest: true },
    fromHost: false,
    body: "Nobody tosses a dwarf 🪓",
    sentAt: "2026-05-20T09:58:40Z",
    moderated: false,
  },
  {
    id: "chat_fellowship_4",
    authorPlayerId: mockFrodoPlayerId,
    author: { name: mockFrodoUser.userName, guest: false },
    fromHost: true,
    body: "Round 2 coming up — eyes on the board.",
    sentAt: "2026-05-20T09:59:10Z",
    moderated: false,
  },
];

export const mockTeams: Team[] = [
  {
    id: "team_west",
    name: "Free Peoples of the West",
    color: "var(--blue-500)",
    captainPlayerId: mockFrodoPlayerId,
    score: 2770,
    memberCount: 2,
  },
  {
    id: "team_east",
    name: "Allies of Erebor",
    color: "var(--red-500)",
    captainPlayerId: mockGimliPlayerId,
    score: 2180,
    memberCount: 2,
  },
];

export const mockFellowshipSession: InteractiveSessionResponse = {
  id: "session_fellowship_lobby",
  roomCode: "MORDOR",
  inviteToken: "invite_fellowship_001",
  status: "IN_PROGRESS",
  phase: "SUBMIT",
  format: "GAME",
  hostPlayerId: mockFrodoPlayerId,
  hostName: mockFrodoUser.name!,
  hostAvatarUrl: mockFrodoUser.pictureUrl,
  deckId: mockFellowshipTriviaDeck.id!,
  deckVersion: 1,
  deckSnapshot: mockFellowshipTriviaDeck.elements!,
  settings: {
    ...mockSessionSettings,
    deckCoverImageUrl: mockFellowshipTriviaDeck.cover?.externalUrl,
    deckBackgroundImageUrl: mockFellowshipTriviaDeck.background?.externalUrl,
    themeId: mockElvenTwilightTheme.id,
    anonymousMode: false,
    allowReJoin: true,
  },
  players: mockFellowshipPlayers,
  teams: [],
  customRoomCode: "MORDOR",
  spectatorCount: 3,
  lobbyOpenedAt: RECENT,
  currentRound: 2,
  totalRounds: mockFellowshipTriviaDeck.elements!.length,
  revealedElementIds: [mockTitleSlide.id!, mockMcqQuestion.id!],
  elementResponseModeOverrides: {},
  viewerPlayerId: mockFrodoPlayerId,
  createdAt: RECENT,
  startedAt: RECENT,
  timerPaused: false,
};

export const mockTeamSession: InteractiveSessionResponse = {
  ...mockFellowshipSession,
  id: "session_helms_deep_team",
  roomCode: "HELMSD",
  customRoomCode: "HELMSD",
  status: "LOBBY",
  format: "GAME",
  hostPlayerId: mockAragornPlayerId,
  hostName: mockAragornUser.name!,
  hostAvatarUrl: mockAragornUser.pictureUrl,
  viewerPlayerId: mockAragornPlayerId,
  settings: {
    ...mockTeamSessionSettings,
    deckCoverImageUrl: mockFellowshipTriviaDeck.cover?.externalUrl,
    deckBackgroundImageUrl: mockFellowshipTriviaDeck.background?.externalUrl,
    themeId: mockElvenTwilightTheme.id,
    anonymousMode: false,
    allowReJoin: true,
  },
  teams: mockTeams,
  currentRound: 0,
  revealedElementIds: [],
};

export const mockInteractiveSessions: InteractiveSessionResponse[] = [
  mockFellowshipSession,
  mockTeamSession,
];

// ─── Scheduled sessions ─────────────────────────────────────────────────────

export const mockScheduledSession: ScheduledInteractiveSessionResponse = {
  id: "scheduled_council_of_elrond",
  hostUserId: mockGandalfUser.id,
  hostName: mockGandalfUser.name,
  deckId: mockAncientLoreDeck.id,
  deckName: mockAncientLoreDeck.name,
  settings: mockSessionSettings,
  scheduledStartAt: "2026-06-01T18:00:00Z",
  scheduledEndAt: "2026-06-01T19:00:00Z",
  reminderEmailTemplate:
    "The Council of Elrond convenes at sundown. Bring your wits.",
  invitedEmails: [
    "frodo@baggins.shire",
    "strider@dunedain.eriador",
    "prince@mirkwood.elven",
    "gimli@erebor.dwarven",
  ],
  createdInteractiveSessionId: undefined,
  status: "SCHEDULED",
  createdAt: RECENT,
  updatedAt: RECENT,
};

export const mockScheduledSessions: ScheduledInteractiveSessionResponse[] = [
  mockScheduledSession,
  {
    ...mockScheduledSession,
    id: "scheduled_rohan_muster",
    hostUserId: mockAragornUser.id,
    hostName: mockAragornUser.name,
    deckId: mockFellowshipTriviaDeck.id,
    deckName: mockFellowshipTriviaDeck.name,
    scheduledStartAt: "2026-06-15T14:00:00Z",
    scheduledEndAt: "2026-06-15T15:00:00Z",
    reminderEmailTemplate: "Ride out to muster at Edoras.",
    status: "SCHEDULED",
  },
];

// ─── Notifications ──────────────────────────────────────────────────────────

export const mockInviteNotification: NotificationResponse = {
  id: "notif_invite_council",
  userId: mockFrodoUser.id,
  kind: "INTERACTIVE_SESSION_INVITE",
  title: "Gandalf invited you to the Council of Elrond",
  body: "Scheduled for June 1 at sundown.",
  link: `/scheduled/${mockScheduledSession.id}`,
  iconUrl: mockGandalfUser.pictureUrl,
  meta: { scheduledSessionId: mockScheduledSession.id! },
  actor: {
    userId: mockGandalfUser.id,
    name: mockGandalfUser.name,
    pictureUrl: mockGandalfUser.pictureUrl,
  },
  read: false,
  createdAt: RECENT,
};

export const mockCommentNotification: NotificationResponse = {
  id: "notif_comment_reply",
  userId: mockFrodoUser.id,
  kind: "DECK_COMMENT_REPLY",
  title: "Samwise replied to your comment",
  body: "Brilliant deck, Mr. Frodo. The taters slide hits home.",
  link: `/decks/${mockFellowshipTriviaDeck.id}`,
  iconUrl: mockSamUser.pictureUrl,
  meta: {
    deckId: mockFellowshipTriviaDeck.id!,
    commentId: mockDeckComment.id!,
  },
  actor: {
    userId: mockSamUser.id,
    name: mockSamUser.name,
    pictureUrl: mockSamUser.pictureUrl,
  },
  read: true,
  createdAt: RECENT,
  readAt: RECENT,
};

export const mockAchievementNotification: NotificationResponse = {
  id: "notif_achievement_streak",
  userId: mockSamUser.id,
  kind: "ACHIEVEMENT",
  title: "Seven-day streak!",
  body: "You've played Ambi every day for a week. Stay loyal, Master Samwise.",
  read: false,
  createdAt: RECENT,
};

export const mockNotifications: NotificationResponse[] = [
  mockInviteNotification,
  mockCommentNotification,
  mockAchievementNotification,
];

// ─── Convenience aggregate ──────────────────────────────────────────────────

// One bag containing one of everything — handy when a screen needs to seed a
// store with sensible defaults all at once.
export const mockData = {
  users: mockUsers,
  guestUsers: mockGuestUsers,
  leaderboard: mockLeaderboard,
  themes: mockThemes,
  tags: mockTags,
  organizations: mockOrganizations,
  mediaAssets: mockMediaAssets,
  galleryImages: mockGalleryImages,
  elements: mockAllElements,
  decks: mockDecks,
  collections: [mockMiddleEarthCollection] as DeckCollectionResponse[],
  comments: mockDeckComments,
  sessions: mockInteractiveSessions,
  scheduledSessions: mockScheduledSessions,
  notifications: mockNotifications,
} as const;
