/**
 * LOTR-themed mock data for the deck feature's response DTOs.
 *
 * Use these for Storybook stories, isolated component dev, unit tests, and
 * bootstrapping a screen before its query is wired up.
 *
 * Conventions:
 *  - Every type is imported from `deckApi.gen.ts` / `commentApi.gen.ts` so these
 *    mocks stay in sync with codegen — if a field is added or renamed,
 *    TypeScript fails here before it fails in a real consumer.
 *  - Slides are no longer embedded in `DeckResponse`; the deck list/get
 *    endpoints return decks, and `ListDeckSlides` returns `SlideResponse[]`
 *    separately. So decks and their slides are exported as parallel mocks
 *    (`mockFellowshipTriviaDeck` + `mockFellowshipSlides`), cross-linked by id.
 *  - `creatorUserId` / owner ids (`u_*`) and `themeId` (`theme_*`) cross-link
 *    with `accountMockData` and `themeMockData`.
 */
import { externalImage } from "@utils/image";

import type {
  AuthorResponse,
  CommentResponse,
  CommentThreadResponse,
} from "../store/commentApi.gen";
import type {
  AllocationContent,
  AnswerSettings,
  AppImage,
  AudienceSettings,
  DeckAccessGrant,
  DeckResponse,
  DeckSettings,
  DeckStats,
  DrawingContent,
  FollowUpContent,
  GridContent,
  MatchingContent,
  McqContent,
  McqOption,
  MediaContent,
  NumberContent,
  Ownership,
  PlaceOnImageContent,
  PointSettings,
  QAndAContent,
  RankingContent,
  ScalesContent,
  SlideResponse,
  TextContent,
  TitleContent,
  ViewerPermissions,
} from "../store/deckApi.gen";
import { ResultsDisplayMode } from "../store/deckEnums.gen";

// ─── shared primitives ──────────────────────────────────────────────────────

const THIRD_AGE = "3018-12-25T18:00:00Z";
const RECENT = "2026-05-15T09:00:00Z";

const U_FRODO = "u_frodo";
const U_GANDALF = "u_gandalf";
const U_SAM = "u_sam";

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

const textOption = (id: string, text: string, color?: string): McqOption => ({
  id,
  optionType: "TEXT",
  text,
  color,
});

// ─── Settings ────────────────────────────────────────────────────────────────

const pointSettings: PointSettings = {
  points: 1000,
  deceptionPoints: 0,
  bestAnswerPoints: 500,
  fastestCorrectAnswerPoints: 250,
  streakBonuses: {
    "3": { countRequired: 3, bonusPoints: 100 },
    "5": { countRequired: 5, bonusPoints: 250 },
  },
  resetStreakOnStreakEnd: true,
};

const answerSettings: AnswerSettings = {
  displayResultsMode: ResultsDisplayMode.ROUND_END,
  allowMultipleAnswers: false,
  shuffleOptions: true,
  anonymizeAnswers: false,
  countdownTime: 30,
  allowAnonymous: true,
  maxSelections: 1,
};

const audienceSettings: AudienceSettings = {
  maxParticipants: 50,
  reactionsEnabled: true,
  chatEnabled: true,
  allowLateJoin: true,
  allowReJoin: true,
  anonymousMode: false,
  allowGuests: true,
};

export const mockDeckSettings: DeckSettings = {
  pointSettings,
  answerSettings,
  audienceSettings,
};

// ─── SlideContent (one per content type) ─────────────────────────────────────

const titleContent: TitleContent = { contentType: "TITLE" };

const mcqContent: McqContent = {
  contentType: "MCQ",
  options: [
    textOption("opt_aragorn", "Aragorn", "var(--red-500)"),
    textOption("opt_frodo", "Frodo Baggins", "var(--blue-500)"),
    textOption("opt_sam", "Samwise Gamgee", "var(--green-500)"),
    textOption("opt_boromir", "Boromir", "var(--yellow-500)"),
  ],
  correctOptionIds: ["opt_frodo"],
  dataVisualization: "BAR_VERTICAL",
};

const numberContent: NumberContent = {
  contentType: "NUMBER",
  answer: 9,
  scoreMode: "EXACT",
  tolerance: 0,
  unit: "members",
  min: 0,
  max: 99,
};

const textContent: TextContent = {
  contentType: "TEXT",
  acceptedAnswers: ["Andúril", "Anduril", "Flame of the West"],
  matchMode: "CONTAINS",
  caseSensitive: false,
  trimWhitespace: true,
  maxLength: 60,
};

const rankingContent: RankingContent = {
  contentType: "RANKING",
  items: [
    { id: "rank_first", label: "First Age" },
    { id: "rank_second", label: "Second Age" },
    { id: "rank_third", label: "Third Age" },
    { id: "rank_fourth", label: "Fourth Age" },
  ],
  correctOrder: ["rank_first", "rank_second", "rank_third", "rank_fourth"],
  scoreMode: "PARTIAL",
};

const scalesContent: ScalesContent = {
  contentType: "SCALES",
  min: 1,
  max: 5,
  step: 1,
  leftLabel: "Skip it",
  rightLabel: "Sacred",
  items: [
    { id: "meal_breakfast", label: "Breakfast" },
    { id: "meal_second", label: "Second breakfast" },
    { id: "meal_elevenses", label: "Elevenses" },
    { id: "meal_luncheon", label: "Luncheon" },
  ],
  correctValues: {
    meal_breakfast: 5,
    meal_second: 5,
    meal_elevenses: 4,
    meal_luncheon: 4,
  },
  tolerance: 1,
};

const gridContent: GridContent = {
  contentType: "GRID",
  rowLabels: ["Hobbit", "Wizard"],
  colLabels: ["Shire", "Moria", "Gondor"],
  items: [
    { id: "grid_frodo", label: "Frodo" },
    { id: "grid_gandalf", label: "Gandalf" },
  ],
  correctCells: {
    grid_frodo: "Shire",
    grid_gandalf: "Moria",
  },
  scoreMode: "PARTIAL",
};

const placeOnImageContent: PlaceOnImageContent = {
  contentType: "PLACE_ON_IMAGE",
  image: externalImage(
    "https://picsum.photos/seed/middle-earth-map/1600/1200",
  ),
  correctTargets: [{ id: "target_minas_tirith", x: 0.62, y: 0.58, radius: 0.04 }],
  scoreMode: "INSIDE_RADIUS",
};

const matchingContent: MatchingContent = {
  contentType: "MATCHING",
  left: [
    { id: "left_anduril", label: "Andúril" },
    { id: "left_sting", label: "Sting" },
    { id: "left_glamdring", label: "Glamdring" },
  ],
  right: [
    { id: "right_aragorn", label: "Aragorn" },
    { id: "right_frodo", label: "Frodo Baggins" },
    { id: "right_gandalf", label: "Gandalf" },
  ],
  correctPairs: {
    left_anduril: "right_aragorn",
    left_sting: "right_frodo",
    left_glamdring: "right_gandalf",
  },
  scoreMode: "PARTIAL",
};

const allocationContent: AllocationContent = {
  contentType: "ALLOCATION",
  options: [
    textOption("alloc_frodo", "Frodo"),
    textOption("alloc_sam", "Sam"),
    textOption("alloc_pippin", "Pippin"),
    textOption("alloc_merry", "Merry"),
  ],
  correctAllocations: {
    alloc_frodo: 3,
    alloc_sam: 3,
    alloc_pippin: 3,
    alloc_merry: 3,
  },
  totalPointsToAllocate: 12,
  tolerancePerOption: 1,
};

const drawingContent: DrawingContent = {
  contentType: "DRAWING",
  imagePrompt: externalImage("https://picsum.photos/seed/mordor-map/1200/800"),
  canvasWidth: 1200,
  canvasHeight: 800,
  tools: ["PEN", "ERASER", "COLOR_PALETTE"],
};

const mediaContent: MediaContent = {
  contentType: "MEDIA",
  mediaType: "IMAGE",
  image: externalImage("https://picsum.photos/seed/bag-end/1600/900"),
  caption: "Gandalf arrives at Bag End.",
  autoplay: false,
  loop: false,
  muted: true,
};

const qAndAContent: QAndAContent = {
  contentType: "Q_AND_A",
  maxResponses: 3,
  moderated: true,
};

const followUpContent: FollowUpContent = {
  contentType: "FOLLOW_UP",
  mode: "PREDICT_POPULAR",
};

// ─── Slides ──────────────────────────────────────────────────────────────────

const slide = (
  id: string,
  title: string,
  content: SlideResponse["content"],
  extra: Partial<SlideResponse> = {},
): SlideResponse => ({
  id,
  title,
  createdByUserId: U_FRODO,
  lastEditedByUserId: U_FRODO,
  version: 1,
  content,
  ...extra,
});

export const mockTitleSlide = slide("slide_title", "Fellowship Trivia", titleContent, {
  sortOrder: "a0",
  backgroundImage: externalImage(
    "https://picsum.photos/seed/title-rivendell/1920/1080",
  ),
});

export const mockMcqSlide = slide("slide_mcq", "The Ring Bearer", mcqContent, {
  sortOrder: "a1",
  section: "Round 1",
  difficulty: "EASY",
  explanation:
    "Frodo bore the Ring the whole journey — Sam carried it briefly in Cirith Ungol.",
});

export const mockNumberSlide = slide(
  "slide_number",
  "Nine Walkers",
  numberContent,
  {
    sortOrder: "a2",
    difficulty: "EASY",
    explanation: "Four hobbits, two men, an elf, a dwarf, and a wizard.",
  },
);

export const mockTextSlide = slide(
  "slide_text",
  "Reforged in Rivendell",
  textContent,
  { sortOrder: "a3", difficulty: "MEDIUM" },
);

export const mockRankingSlide = slide(
  "slide_ranking",
  "Ages of Middle-earth",
  rankingContent,
  { sortOrder: "a4", difficulty: "MEDIUM" },
);

export const mockScalesSlide = slide(
  "slide_scales",
  "Hobbit Mealtimes",
  scalesContent,
  { sortOrder: "a5" },
);

export const mockGridSlide = slide("slide_grid", "Who Goes Where", gridContent, {
  sortOrder: "a6",
  difficulty: "MEDIUM",
});

export const mockPlaceOnImageSlide = slide(
  "slide_place",
  "Find Minas Tirith",
  placeOnImageContent,
  { sortOrder: "a7", difficulty: "MEDIUM" },
);

export const mockMatchingSlide = slide(
  "slide_matching",
  "Blade-bearers",
  matchingContent,
  { sortOrder: "a8", difficulty: "MEDIUM" },
);

export const mockAllocationSlide = slide(
  "slide_allocation",
  "Ration the Lembas",
  allocationContent,
  { sortOrder: "a9" },
);

export const mockDrawingSlide = slide(
  "slide_drawing",
  "Sketch Mordor",
  drawingContent,
  { sortOrder: "b0", difficulty: "HARD" },
);

export const mockMediaSlide = slide(
  "slide_media",
  "A Long-expected Party",
  mediaContent,
  { sortOrder: "b1" },
);

export const mockQAndASlide = slide(
  "slide_qanda",
  "Hobbit Hot Takes",
  qAndAContent,
  { sortOrder: "b2" },
);

export const mockFollowUpSlide = slide(
  "slide_followup",
  "Tell us more",
  followUpContent,
  { sortOrder: "b3", parentId: "slide_qanda" },
);

export const mockEndSlide = slide(
  "slide_end",
  "Well done, traveller.",
  titleContent,
  {
    sortOrder: "b4",
    backgroundImage: externalImage(
      "https://picsum.photos/seed/end-shire/1920/1080",
    ),
  },
);

// One of each content kind, in a natural deck order — handy for editor demos.
export const mockAllSlides: SlideResponse[] = [
  mockTitleSlide,
  mockMcqSlide,
  mockNumberSlide,
  mockTextSlide,
  mockRankingSlide,
  mockScalesSlide,
  mockGridSlide,
  mockPlaceOnImageSlide,
  mockMatchingSlide,
  mockAllocationSlide,
  mockDrawingSlide,
  mockMediaSlide,
  mockQAndASlide,
  mockFollowUpSlide,
  mockEndSlide,
];

// The curated slide list for the Fellowship Trivia deck.
export const mockFellowshipSlides: SlideResponse[] = [
  mockTitleSlide,
  mockMcqSlide,
  mockNumberSlide,
  mockTextSlide,
  mockEndSlide,
];

// ─── Decks ───────────────────────────────────────────────────────────────────

const deckCover = (seed: string): AppImage =>
  externalImage(`https://picsum.photos/seed/${seed}/1200/800`);

const deckBackground = (seed: string): AppImage =>
  externalImage(`https://picsum.photos/seed/${seed}/1920/1080`);

const ownerAcl: DeckAccessGrant[] = [{ userId: U_SAM, role: "EDITOR" }];

const fellowshipStats: DeckStats = {
  playCount: 1289,
  completedPlayCount: 1102,
  completionRate: 0.85,
  uniquePlayerCount: 940,
  viewCount: 4321,
  forkCount: 17,
  averageScorePercent: 0.72,
  ratingAverage: 4.7,
  ratingCount: 23,
  lastPlayedAt: RECENT,
  computedAt: RECENT,
};

export const mockFellowshipTriviaDeck: DeckResponse = {
  id: "deck_fellowship_trivia",
  publicId: "FELLOWSHIP",
  name: "Fellowship Trivia",
  description:
    "A grab-bag of trivia about the nine walkers, from Bag End to Mount Doom.",
  coverImage: deckCover("fellowship-cover"),
  backgroundImage: deckBackground("fellowship-bg"),
  themeId: "theme_elven_twilight",
  version: 3,
  publishStatus: "PUBLISHED",
  visibility: "PUBLIC",
  publishedAt: THIRD_AGE,
  language: "en",
  creatorUserId: U_FRODO,
  originalAuthorUserId: U_FRODO,
  settings: mockDeckSettings,
  tags: ["lotr", "trivia", "fellowship"],
  organizationId: "org_fellowship",
  ownership: ownedBy(U_FRODO),
  acl: ownerAcl,
  stats: fellowshipStats,
  createdAt: THIRD_AGE,
  updatedAt: RECENT,
  permissions: fullPermissions,
};

export const mockSecondBreakfastDeck: DeckResponse = {
  id: "deck_second_breakfast",
  publicId: "TATERS",
  name: "Second Breakfast",
  description: "A poll-style deck — no scoring, just hobbit hot takes.",
  coverImage: deckCover("second-breakfast-cover"),
  themeId: "theme_shire_morning",
  version: 1,
  publishStatus: "PUBLISHED",
  visibility: "PUBLIC",
  publishedAt: THIRD_AGE,
  language: "en",
  creatorUserId: U_SAM,
  originalAuthorUserId: U_SAM,
  settings: {
    ...mockDeckSettings,
    pointSettings: { ...pointSettings, points: 0 },
  },
  tags: ["lotr", "pulse", "hobbits"],
  organizationId: "org_fellowship",
  ownership: ownedBy(U_SAM),
  acl: [],
  stats: {
    playCount: 540,
    completedPlayCount: 498,
    completionRate: 0.92,
    uniquePlayerCount: 410,
    viewCount: 1920,
    forkCount: 8,
    averageScorePercent: 0,
    ratingAverage: 4.4,
    ratingCount: 11,
    lastPlayedAt: RECENT,
    computedAt: RECENT,
  },
  createdAt: THIRD_AGE,
  updatedAt: RECENT,
  permissions: fullPermissions,
};

export const mockAncientLoreDeck: DeckResponse = {
  id: "deck_ancient_lore",
  publicId: "EREGION",
  name: "Ancient Lore",
  description: "For wizards, lore-masters, and anyone who reads the appendices.",
  coverImage: deckCover("ancient-lore-cover"),
  themeId: "theme_wizards_counsel",
  version: 2,
  publishStatus: "PUBLISHED",
  visibility: "ORG",
  publishedAt: THIRD_AGE,
  language: "en",
  creatorUserId: U_GANDALF,
  originalAuthorUserId: U_GANDALF,
  settings: mockDeckSettings,
  tags: ["lotr", "lore", "advanced"],
  organizationId: "org_white_council",
  ownership: { type: "ORGANIZATION", ownerId: "org_white_council" },
  acl: [{ userId: U_FRODO, role: "VIEWER" }],
  stats: {
    playCount: 142,
    completedPlayCount: 96,
    completionRate: 0.68,
    uniquePlayerCount: 88,
    viewCount: 612,
    forkCount: 3,
    averageScorePercent: 0.61,
    ratingAverage: 4.9,
    ratingCount: 7,
    computedAt: RECENT,
  },
  createdAt: "1019-01-01T00:00:00Z",
  updatedAt: RECENT,
  permissions: viewOnly,
};

export const mockDecks: DeckResponse[] = [
  mockFellowshipTriviaDeck,
  mockSecondBreakfastDeck,
  mockAncientLoreDeck,
];

// ─── Comment threads ─────────────────────────────────────────────────────────

const samAuthor: AuthorResponse = {
  userId: U_SAM,
  name: "Samwise Gamgee",
  avatar: {
    image: {
      external: true,
      externalSrc: "https://picsum.photos/seed/sam/200/200",
      variants: {},
    },
  },
};

const frodoAuthor: AuthorResponse = {
  userId: U_FRODO,
  name: "Frodo Baggins",
  avatar: {
    image: {
      external: true,
      externalSrc: "https://picsum.photos/seed/frodo/200/200",
      variants: {},
    },
  },
};

export const mockOpenCommentThread: CommentThreadResponse = {
  id: "thread_taters",
  slideId: mockMcqSlide.id,
  status: "OPEN",
  comments: [
    {
      id: "comment_one",
      author: samAuthor,
      body: "Brilliant slide, Mr. Frodo. Should the explanation mention Sam?",
      edited: false,
      deleted: false,
    },
    {
      id: "comment_two",
      author: frodoAuthor,
      body: "Good call, Sam — I'll add a line about Cirith Ungol.",
      edited: true,
      deleted: false,
    },
  ] satisfies CommentResponse[],
};

export const mockResolvedCommentThread: CommentThreadResponse = {
  id: "thread_resolved",
  slideId: mockNumberSlide.id,
  status: "RESOLVED",
  comments: [
    {
      id: "comment_three",
      author: frodoAuthor,
      body: "Tolerance should be 0 here — exact count only.",
      edited: false,
      deleted: false,
    },
  ],
};

export const mockCommentThreads: CommentThreadResponse[] = [
  mockOpenCommentThread,
  mockResolvedCommentThread,
];
