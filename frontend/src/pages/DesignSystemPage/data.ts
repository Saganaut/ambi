import type { ScoreBoardProps } from "../../components/Games/ScoreBoard/ScoreBoard";
import type {
  PlayerPlacementResponse,
  PublicUserSnapshot,
} from "@store/AmbiApi";

const placement = (
  playerId: string,
  name: string,
  finalScore: number,
  rank: number,
  correctAnswers: number,
  guest = false,
): PlayerPlacementResponse => ({
  playerId,
  user: { name, guest } satisfies PublicUserSnapshot,
  finalScore,
  placement: rank,
  correctAnswers,
  totalQuestions: 10,
});

export interface ThemePreset {
  label: string;
  huePrimary: number;
  hueAccent: number;
}

export const themePresets: ThemePreset[] = [
  { label: "Brand", huePrimary: 290, hueAccent: 50 },
  { label: "Indigo", huePrimary: 260, hueAccent: 25 },
  { label: "Forest", huePrimary: 160, hueAccent: 35 },
  { label: "Sunset", huePrimary: 30, hueAccent: 280 },
  { label: "Ocean", huePrimary: 210, hueAccent: 60 },
  { label: "Orchid", huePrimary: 300, hueAccent: 45 },
  { label: "Midnight", huePrimary: 240, hueAccent: 180 },
];

export const questionCardData = {
  round: 8,
  totalRounds: 10,
  timeRemaining: 25,
  question: {
    id: "q-lotr-108",
    kind: "QUESTION" as const,
    questionText: "In which fiery chasm was the One Ring finally destroyed?",
    options: [
      "The Mines of Maria",
      "The Cracks of Doom",
      "The Pits of Isengard",
      "The Black Gate",
    ],
    pointValue: 500,
    timeLimit: 30,
    type: "MULTIPLE_CHOICE" as const,
    imageUrl: "https://example.com/images/mount-doom.jpg",
  },
};

// Mocks identify players by session-scoped playerId — the real userId never
// surfaces on the wire after the InteractiveSession DTO migration.
export const gameOverData: {
  currentPlayerId: string;
  placements: PlayerPlacementResponse[];
} = {
  currentPlayerId: "player-001",
  placements: [
    placement("player-003", "Gandalf the Grey", 9500, 1, 10),
    placement("player-004", "Aragorn", 1250, 2, 9),
    placement("player-005", "Legolas Greenleaf", 1150, 3, 8),
    placement("player-006", "Gimli Son of Gloin", 1149, 4, 8),
    placement("player-002", "Samwise Gamgee", 900, 5, 7),
    placement("player-001", "Frodo Baggins", 850, 6, 6),
    placement("player-guest-999", "Strider", 320, 7, 3, true),
    placement("player-guest-888", "Peregrin Took", 150, 8, 1, true),
  ],
};
export const colorPalette = [
  {
    label: "Brand",
    tokens: [
      "--electric-violet-200",
      "--electric-violet-500",
      "--electric-violet",
      "--electric-violet-700",
      "--electric-violet-900",
      "--blaze-orange-100",
      "--blaze-orange",
      "--blaze-orange-900",
      "--mariana-blue-100",
      "--mariana-blue",
      "--tolopea",
      "--cyan-100",
      "--cyan",
      "--cyan-900",
      "--shell",
      "--black-white",
      "--black-russian",
    ],
  },
  {
    label: "Red",
    tokens: [
      "--red-200",
      "--red-300",
      "--red-400",
      "--red-500",
      "--red-600",
      "--red-700",
      "--red-800",
      "--red-900",
    ],
  },
  {
    label: "Yellow",
    tokens: [
      "--yellow-200",
      "--yellow-300",
      "--yellow-400",
      "--yellow-500",
      "--yellow-600",
      "--yellow-700",
      "--yellow-800",
      "--yellow-900",
    ],
  },
  {
    label: "Green",
    tokens: [
      "--green-200",
      "--green-300",
      "--green-400",
      "--green-500",
      "--green-600",
      "--green-700",
      "--green-800",
      "--green-900",
    ],
  },
  {
    label: "Turqoise",
    tokens: [
      "--turqoise-200",
      "--turqoise-300",
      "--turqoise-400",
      "--turqoise-500",
      "--turqoise-600",
      "--turqoise-700",
      "--turqoise-800",
      "--turqoise-900",
    ],
  },

  {
    label: "Blue",
    tokens: [
      "--blue-200",
      "--blue-300",
      "--blue-400",
      "--blue-500",
      "--blue-600",
      "--blue-700",
      "--blue-800",
      "--blue-900",
    ],
  },
  {
    label: "Lavender",
    tokens: [
      "--lavender-200",
      "--lavender-300",
      "--lavender-400",
      "--lavender-500",
      "--lavender-600",
      "--lavender-700",
      "--lavender-800",
      "--lavender-900",
    ],
  },
  {
    label: "Fuchsia",
    tokens: [
      "--fuchsia-200",
      "--fuchsia-300",
      "--fuchsia-400",
      "--fuchsia-500",
      "--fuchsia-600",
      "--fuchsia-700",
      "--fuchsia-800",
      "--fuchsia-900",
    ],
  },
  {
    label: "Mulberry",
    tokens: [
      "--mulberry-200",
      "--mulberry-300",
      "--mulberry-400",
      "--mulberry-500",
      "--mulberry-600",
      "--mulberry-700",
      "--mulberry-800",
      "--mulberry-900",
    ],
  },
];

export interface SemanticTokenGroup {
  label: string;
  tokens: string[];
}

export const semanticTokenGroups: SemanticTokenGroup[] = [
  {
    label: "Backgrounds",
    tokens: [
      "--bg-canvas",
      "--bg-surface",
      "--bg-surface-raised",
      "--bg-secondary",
      "--bg-subtle",
      "--bg-primary",
      "--bg-brand",
      "--bg-disabled",
    ],
  },
  {
    label: "Inverted backgrounds",
    tokens: [
      "--bg-canvas-inverted",
      "--bg-surface-inverted",
      "--bg-primary-inverted",
    ],
  },
  {
    label: "Background — status",
    tokens: ["--bg-error", "--bg-success", "--bg-warning", "--bg-info"],
  },
  {
    label: "Text",
    tokens: [
      "--text-primary",
      "--text-secondary",
      "--text-muted",
      "--text-accent",
      "--text-on-brand",
      "--text-disabled",
    ],
  },
  {
    label: "Inverted text",
    tokens: [
      "--text-primary-inverted",
      "--text-secondary-inverted",
      "--text-accent-inverted",
    ],
  },
  {
    label: "Text — status",
    tokens: ["--text-error", "--text-success", "--text-warning", "--text-info"],
  },
  {
    label: "Borders",
    tokens: [
      "--border-default",
      "--border-subtle",
      "--border-focus",
      "--border-brand",
      "--border-disabled",
    ],
  },
  {
    label: "Borders — status",
    tokens: [
      "--border-success",
      "--border-warning",
      "--border-error",
      "--border-info",
    ],
  },
  {
    label: "Actions",
    tokens: ["--action-hover", "--action-active", "--action-disabled"],
  },
];

// Per-player chrome stats the ScoreBoard snapshot doesn't exercise — zeroed so
// each mock below only has to specify the fields it actually demonstrates
// (playerId / user / score).
const playerStatDefaults = {
  avatar: { avatarType: "LINK" as const },
  currentStreak: 0,
  longestStreak: 0,
  accuracy: 0,
  reactionsSent: 0,
  speedBonusTotal: 0,
  lateJoin: false,
  disconnected: false,
};

// Player identity is the session-scoped playerId (never the underlying userId).
// The mocks use stable "player-<name>" handles so design-system snapshots stay
// readable across regenerations.
export const playersData: ScoreBoardProps = {
  players: [
    {
      playerId: "player-001",
      user: {
        name: "Frodo Baggins",
        pictureUrl: "https://example.com/avatars/frodo.jpg",
        guest: false,
      },
      score: 450,
    },
    {
      playerId: "player-002",
      user: {
        name: "Samwise Gamgee",
        pictureUrl: "https://example.com/avatars/sam.jpg",
        guest: false,
      },
      score: 500,
    },
    {
      playerId: "player-003",
      user: {
        name: "Gandalf the Grey",
        pictureUrl: "https://example.com/avatars/gandalf.jpg",
        guest: false,
      },
      score: 9001,
    },
    {
      playerId: "player-004",
      user: {
        name: "Aragorn",
        pictureUrl: "https://example.com/avatars/aragorn.jpg",
        guest: false,
      },
      score: 850,
    },
    {
      playerId: "player-005",
      user: {
        name: "Legolas Greenleaf",
        pictureUrl: "https://example.com/avatars/legolas.jpg",
        guest: false,
      },
      score: 770,
    },
    {
      playerId: "player-006",
      user: {
        name: "Gimli Son of Gloin",
        pictureUrl: "https://example.com/avatars/gimli.jpg",
        guest: false,
      },
      score: 769,
    },
    {
      playerId: "player-guest-999",
      user: {
        name: "Strider",
        pictureUrl: "",
        guest: true,
      },
      score: 120,
    },
    {
      playerId: "player-guest-888",
      user: {
        name: "Peregrin Took",
        pictureUrl: "https://example.com/avatars/pippin.jpg",
        guest: true,
      },
      score: 50,
    },
  ].map((player) => ({ ...playerStatDefaults, ...player })),
  currentPlayerId: "player-001",
};

export const formSampleData = {
  radioOptions: [
    { label: "Classic", value: "classic" },
    { label: "Timed", value: "timed" },
    { label: "Survival", value: "survival" },
  ],
};

export const RoundResultData = {
  round: 3,
  element: {
    kind: "McqQuestion" as const,
    id: "lotr-fellowship",
    prompt: "How many walkers were in the Fellowship of the Ring?",
    options: [
      { id: "opt-1", text: "Seven" },
      { id: "opt-9", text: "Nine" },
      { id: "opt-12", text: "Twelve" },
    ],
    correctOptionIds: ["opt-9"],
    pointValue: 100,
    difficulty: "EASY" as const,
    bestAnswerMode: false,
    bestAnswerPoints: 0,
    displaySeconds: 15,
    mediaPosition: "NONE" as const,
  },
  playerResults: [
    {
      playerId: "player-003",
      userName: "Gandalf the Grey",
      selectedOption: 9,
      wasCorrect: true,
      pointsAwarded: 100,
      totalScore: 9101,
    },
    {
      playerId: "player-002",
      userName: "Samwise Gamgee",
      selectedOption: 9,
      wasCorrect: true,
      pointsAwarded: 100,
      totalScore: 600,
    },
    {
      playerId: "player-005",
      userName: "Legolas Greenleaf",
      selectedOption: 9,
      wasCorrect: true,
      pointsAwarded: 100,
      totalScore: 870,
    },
    {
      playerId: "player-006",
      userName: "Gimli Son of Gloin",
      selectedOption: 9,
      wasCorrect: true,
      pointsAwarded: 100,
      totalScore: 869,
    },
    {
      playerId: "player-001",
      userName: "Frodo Baggins",
      selectedOption: 9,
      wasCorrect: true,
      pointsAwarded: 100,
      totalScore: 550,
    },
    {
      playerId: "player-004",
      userName: "Aragorn",
      selectedOption: 9,
      wasCorrect: true,
      pointsAwarded: 100,
      totalScore: 950,
    },
    {
      playerId: "player-guest-888",
      userName: "Peregrin Took",
      selectedOption: 2,
      wasCorrect: false,
      pointsAwarded: 0,
      totalScore: 50,
    },
    {
      playerId: "player-guest-999",
      userName: "Strider",
      selectedOption: 1,
      wasCorrect: false,
      pointsAwarded: 0,
      totalScore: 120,
    },
  ],
  // Demo Best Answer REVEAL block; harmless on non-best-answer rounds since
  // RoundResult only renders BestAnswerReveal when this field is set.
  bestAnswer: {
    tallies: [
      {
        submissionId: "sub-aragorn",
        playerId: "player-004",
        userName: "Aragorn",
        payload: { kind: "TextAnswer" as const, text: "Strider of the North" },
        voteCount: 3,
      },
      {
        submissionId: "sub-frodo",
        playerId: "player-001",
        userName: "Frodo Baggins",
        payload: {
          kind: "TextAnswer" as const,
          text: "Ring-bearer at Mount Doom",
        },
        voteCount: 2,
      },
      {
        submissionId: "sub-gimli",
        playerId: "player-006",
        userName: "Gimli",
        payload: { kind: "TextAnswer" as const, text: "And my axe!" },
        voteCount: 1,
      },
    ],
    winnerPlayerIds: ["player-004"],
    bonusAwarded: 50,
  },
};
