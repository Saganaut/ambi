// Form-state + deck-seeding for the "customize a game before starting" flow on
// CreateGamePage. Owns the SettingsState shape, the platform defaults, the
// deck fetch, and the one-shot seeding cascade (deck.defaultSettings →
// platform defaults) so the page itself can stay focused on JSX.
import { useState } from "react";
import { useGetDeckQuery, type DeckResponse } from "../store/BrainFlexApi";

// Renamed from `SessionMode` in chunk 24 to avoid colliding with the new
// SessionFormat (GAME / PRESENTATION) concept. Same values, semantic name.
type AnswerSubmissionMode = "SIMULTANEOUS" | "TURN_BASED";
type SessionFormat = "GAME" | "PRESENTATION";
type ShowResponsesMode = "INHERIT" | "INSTANT" | "ON_CLICK" | "PRIVATE";

const DEFAULT_TIME = 15;
const DEFAULT_SPEED_BONUS = true;
const DEFAULT_MODE: AnswerSubmissionMode = "SIMULTANEOUS";
const DEFAULT_FORMAT: SessionFormat = "GAME";
const DEFAULT_SHOW_RESPONSES: ShowResponsesMode = "INHERIT";
const DEFAULT_MAX_PLAYERS = 8;
const DEFAULT_ALLOW_GUESTS = true;
const DEFAULT_ALLOW_LATE_JOIN = false;
const DEFAULT_SHOW_SCORES_IMMEDIATELY = true;
const DEFAULT_REACTIONS_ENABLED = true;
const DEFAULT_CHAT_ENABLED = true;
const DEFAULT_TEAM_MODE = false;
const DEFAULT_TEAM_COUNT = 4;
const DEFAULT_AUTO_BALANCE_TEAMS = true;
const DEFAULT_ANONYMOUS_MODE = false;
// Chunk 13 — lobby/auto-advance/shuffle defaults. Wire ordering mirrors the
// backend {@code InteractiveSessionSettings} defaults; the platform values
// here apply when the deck doesn't override them.
const DEFAULT_SHUFFLE_QUESTIONS = false;
const DEFAULT_SHUFFLE_ANSWERS = true;
const DEFAULT_AUTO_ADVANCE = false;
const DEFAULT_PODIUM_DURATION = 15;
const DEFAULT_LOBBY_COUNTDOWN_SECONDS = 5;
const DEFAULT_SPECTATORS_ALLOWED = false;

interface SettingsState {
  // Chunk 24 — chrome flavor. Pre-fills from deck.defaultSessionFormat but
  // the host can override; the chosen value is frozen onto the session at
  // create time and never re-read from the deck after.
  format: SessionFormat;
  // Chunk 24 — top of the session > deck > element cascade. INHERIT defers
  // to the deck's default, which itself defers to the per-element value,
  // which finally falls back to the format default.
  showResponses: ShowResponsesMode;
  // 0 = unlimited (no countdown). Any positive value enables the timer.
  timePerQuestion: number;
  speedBonus: boolean;
  answerSubmissionMode: AnswerSubmissionMode;
  maxPlayers: number;
  allowGuests: boolean;
  allowLateJoin: boolean;
  showScoresImmediately: boolean;
  reactionsEnabled: boolean;
  chatEnabled: boolean;
  teamMode: boolean;
  teamCount: number;
  autoBalanceTeams: boolean;
  anonymousMode: boolean;
  customRoomCode: string;
  // Chunk 13 — lobby polish + auto-advance toggles. All optional on the
  // CreateInteractiveSessionRequest; backend falls back to the same defaults.
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  autoAdvance: boolean;
  podiumDuration: number;
  lobbyCountdownSeconds: number;
  spectatorsAllowed: boolean;
}

const PLATFORM_DEFAULTS: SettingsState = {
  format: DEFAULT_FORMAT,
  showResponses: DEFAULT_SHOW_RESPONSES,
  timePerQuestion: DEFAULT_TIME,
  speedBonus: DEFAULT_SPEED_BONUS,
  answerSubmissionMode: DEFAULT_MODE,
  maxPlayers: DEFAULT_MAX_PLAYERS,
  allowGuests: DEFAULT_ALLOW_GUESTS,
  allowLateJoin: DEFAULT_ALLOW_LATE_JOIN,
  showScoresImmediately: DEFAULT_SHOW_SCORES_IMMEDIATELY,
  reactionsEnabled: DEFAULT_REACTIONS_ENABLED,
  chatEnabled: DEFAULT_CHAT_ENABLED,
  teamMode: DEFAULT_TEAM_MODE,
  teamCount: DEFAULT_TEAM_COUNT,
  autoBalanceTeams: DEFAULT_AUTO_BALANCE_TEAMS,
  anonymousMode: DEFAULT_ANONYMOUS_MODE,
  customRoomCode: "",
  shuffleQuestions: DEFAULT_SHUFFLE_QUESTIONS,
  shuffleAnswers: DEFAULT_SHUFFLE_ANSWERS,
  autoAdvance: DEFAULT_AUTO_ADVANCE,
  podiumDuration: DEFAULT_PODIUM_DURATION,
  lobbyCountdownSeconds: DEFAULT_LOBBY_COUNTDOWN_SECONDS,
  spectatorsAllowed: DEFAULT_SPECTATORS_ALLOWED,
};

// Pre-fill the visible form with the deck's defaultSettings + chunk-24
// defaultSessionFormat. The backend cascades nulls through the same chain
// at create time; this only matters for what the host sees in the form.
const seedFromDeck = (deck: DeckResponse): SettingsState => {
  const d = deck.defaultSettings ?? {};
  return {
    format: deck.defaultSessionFormat ?? DEFAULT_FORMAT,
    // Chunk 24 — showResponses left at INHERIT so the deck/element cascade
    // is the visible default until the host opens "More options" and picks
    // something explicit.
    showResponses: DEFAULT_SHOW_RESPONSES,
    timePerQuestion: d.timePerQuestion ?? DEFAULT_TIME,
    speedBonus: d.speedBonus ?? DEFAULT_SPEED_BONUS,
    answerSubmissionMode: d.answerSubmissionMode ?? DEFAULT_MODE,
    maxPlayers: d.maxPlayers ?? DEFAULT_MAX_PLAYERS,
    allowGuests: d.allowGuests ?? DEFAULT_ALLOW_GUESTS,
    allowLateJoin: d.allowLateJoin ?? DEFAULT_ALLOW_LATE_JOIN,
    showScoresImmediately:
      d.showScoresImmediately ?? DEFAULT_SHOW_SCORES_IMMEDIATELY,
    reactionsEnabled: d.reactionsEnabled ?? DEFAULT_REACTIONS_ENABLED,
    chatEnabled: d.chatEnabled ?? DEFAULT_CHAT_ENABLED,
    teamMode: d.teamMode ?? DEFAULT_TEAM_MODE,
    teamCount: d.teamCount ?? DEFAULT_TEAM_COUNT,
    autoBalanceTeams: d.autoBalanceTeams ?? DEFAULT_AUTO_BALANCE_TEAMS,
    anonymousMode: d.anonymousMode ?? DEFAULT_ANONYMOUS_MODE,
    customRoomCode: "",
    shuffleQuestions: d.shuffleQuestions ?? DEFAULT_SHUFFLE_QUESTIONS,
    shuffleAnswers: d.shuffleAnswers ?? DEFAULT_SHUFFLE_ANSWERS,
    autoAdvance: d.autoAdvance ?? DEFAULT_AUTO_ADVANCE,
    podiumDuration: d.podiumDuration ?? DEFAULT_PODIUM_DURATION,
    lobbyCountdownSeconds:
      d.lobbyCountdownSeconds ?? DEFAULT_LOBBY_COUNTDOWN_SECONDS,
    spectatorsAllowed: d.spectatorsAllowed ?? DEFAULT_SPECTATORS_ALLOWED,
  };
};

interface UseGameSettingsResult {
  deck: DeckResponse | undefined;
  isLoadingDeck: boolean;
  settings: SettingsState;
  setSettings: (next: SettingsState) => void;
}

const useGameSettings = (deckId: string | undefined): UseGameSettingsResult => {
  const { data: deck, isLoading: isLoadingDeck } = useGetDeckQuery(
    { id: deckId ?? "" },
    { skip: !deckId },
  );

  const [settings, setSettings] = useState<SettingsState>(PLATFORM_DEFAULTS);
  const [seededFromDeckId, setSeededFromDeckId] = useState<string | null>(null);
  if (deck?.id && deck.id !== seededFromDeckId) {
    setSettings(seedFromDeck(deck));
    setSeededFromDeckId(deck.id);
  }

  return { deck, isLoadingDeck, settings, setSettings };
};

export { useGameSettings, PLATFORM_DEFAULTS };
export type {
  SettingsState,
  SessionFormat,
  ShowResponsesMode,
  AnswerSubmissionMode,
};
