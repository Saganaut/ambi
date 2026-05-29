// CreateGamePage — customize-before-start screen for a known deck. Reached
// via the chevron menu on a deck's Quick Start button (carries ?deckId=<id>).
// The deck-picker step lives on /decks now; without a deckId we bounce there.
// Form state + deck seeding live in useGameSettings.
import { useEffect } from "react";
import { getRouteApi, useNavigate, Link } from "@tanstack/react-router";

import { useCreateInteractiveSessionMutation } from "../../store/AmbiApi";
import { Btn } from "@/components/Common/Buttons/Btn";
import { Input } from "@/components/Common/Input/Input/Input";
import { Checkbox } from "@/components/Common/Input/Checkbox/Checkbox";
import { RadioGroup } from "@/components/Common/Input/RadioGroup/RadioGroup";
import {
  useGameSettings,
  type SettingsState,
  type SessionFormat,
  type ShowResponsesMode,
  type AnswerSubmissionMode,
} from "@/hooks/useGameSettings";
import { extractErrorMessage } from "../../utils/utils";
import styles from "./Game.module.css";

const routeApi = getRouteApi("/_authenticated/games/create");

const TEAM_COUNT_MIN = 2;
const TEAM_COUNT_MAX = 8;

interface FormatOption {
  value: SessionFormat;
  title: string;
  description: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: "GAME",
    title: "Game",
    description:
      "Persistent leaderboard, points, podium. Best for trivia + competitive play.",
  },
  {
    value: "PRESENTATION",
    title: "Presentation",
    description:
      "No leaderboard; aggregated charts each round. Best for polls + Q&A.",
  },
];

const SHOW_RESPONSES_OPTIONS: {
  value: ShowResponsesMode;
  label: string;
}[] = [
  { value: "INHERIT", label: "Use deck / format default" },
  { value: "INSTANT", label: "Show responses live" },
  { value: "ON_CLICK", label: "Reveal on host click" },
  { value: "PRIVATE", label: "Hide responses entirely" },
];

interface SettingsFormProps {
  settings: SettingsState;
  deckDefaultFormat: SessionFormat | undefined;
  onChange: (next: SettingsState) => void;
}

const SettingsForm = ({
  settings,
  deckDefaultFormat,
  onChange,
}: SettingsFormProps) => {
  const patch = (next: Partial<SettingsState>) => {
    onChange({ ...settings, ...next });
  };

  return (
    <div className={styles.settings}>
      {/* Chunk 24 — chrome picker. The deck's defaultSessionFormat pre-fills
          the selection but never locks it: the host owns the final call and
          the value is frozen onto the InteractiveSession at create time. */}
      <div
        className={styles.formatPicker}
        role='radiogroup'
        aria-label='Session format'>
        {FORMAT_OPTIONS.map((opt) => {
          const isActive = settings.format === opt.value;
          const isDeckDefault = deckDefaultFormat === opt.value;
          return (
            <button
              key={opt.value}
              type='button'
              role='radio'
              aria-checked={isActive}
              className={`${styles.formatTile} ${isActive ? styles.formatTileActive : ""}`}
              onClick={() => {
                patch({ format: opt.value });
              }}>
              <span className={styles.formatTileTitle}>{opt.title}</span>
              <span className={styles.formatTileDesc}>{opt.description}</span>
              {isDeckDefault && (
                <span className={styles.formatTileDefault}>Deck default</span>
              )}
            </button>
          );
        })}
      </div>

      <label className={styles.setting}>
        <span>
          Seconds per question
          <span className={styles.settingHint}> (0 = unlimited )</span>
        </span>
        <Input
          type='number'
          min={0}
          max={120}
          value={settings.timePerQuestion}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            patch({ timePerQuestion: Number(e.target.value) });
          }}
          className={styles.numberInput}
        />
      </label>
      <label className={styles.setting}>
        <span>Speed bonus</span>
        <Checkbox
          checked={settings.speedBonus}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            patch({ speedBonus: e.target.checked });
          }}
          disabled={settings.timePerQuestion === 0}
        />
      </label>

      <details className={styles.moreOptions}>
        <summary className={styles.moreOptionsSummary}>More options</summary>
        <div className={styles.moreOptionsBody}>
          {/* Chunk 24 — top of the session > deck > element cascade. INHERIT
              defers all the way down to the format default (GAME → INSTANT,
              PRESENTATION → ON_CLICK). Explicit picks override every layer
              below. */}
          <RadioGroup
            name='showResponses'
            legend='Show responses'
            options={SHOW_RESPONSES_OPTIONS}
            value={settings.showResponses}
            onChange={(value) => {
              patch({ showResponses: value as ShowResponsesMode });
            }}
          />

          <RadioGroup
            name='mode'
            legend='Session mode'
            options={[
              {
                value: "SIMULTANEOUS",
                label: "Simultaneous — everyone answers at once",
              },
              {
                value: "TURN_BASED",
                label: "Turn-based — host advances each round",
              },
            ]}
            value={settings.answerSubmissionMode}
            onChange={(value) => {
              patch({ answerSubmissionMode: value as AnswerSubmissionMode });
            }}
          />

          <label className={styles.setting}>
            <span>Max players</span>
            <Input
              type='number'
              min={2}
              max={20}
              value={settings.maxPlayers}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                patch({ maxPlayers: e.target.valueAsNumber });
              }}
              className={styles.numberInput}
            />
          </label>

          <label className={styles.setting}>
            <span>Allow guests (no sign-in required)</span>
            <Checkbox
              checked={settings.allowGuests}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                patch({ allowGuests: e.target.checked });
              }}
            />
          </label>

          <label className={styles.setting}>
            <span>Allow players to join after the game starts</span>
            <Checkbox
              checked={settings.allowLateJoin}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                patch({ allowLateJoin: e.target.checked });
              }}
            />
          </label>

          <label className={styles.setting}>
            <span>Show scores during the game</span>
            <Checkbox
              checked={settings.showScoresImmediately}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                patch({ showScoresImmediately: e.target.checked });
              }}
            />
          </label>

          <label className={styles.setting}>
            <span>Enable emoji reactions</span>
            <Checkbox
              checked={settings.reactionsEnabled}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                patch({ reactionsEnabled: e.target.checked });
              }}
            />
          </label>

          <label className={styles.setting}>
            <span>Enable audience chat</span>
            <Checkbox
              checked={settings.chatEnabled}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                patch({ chatEnabled: e.target.checked });
              }}
            />
          </label>

          <label className={styles.setting}>
            <span>Team mode</span>
            <Checkbox
              checked={settings.teamMode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                patch({ teamMode: e.target.checked });
              }}
            />
          </label>

          <label className={styles.setting}>
            <span>Number of teams</span>
            <Input
              type='number'
              min={TEAM_COUNT_MIN}
              max={TEAM_COUNT_MAX}
              value={settings.teamCount}
              disabled={!settings.teamMode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                patch({ teamCount: e.target.valueAsNumber });
              }}
              className={styles.numberInput}
            />
          </label>

          <label className={styles.setting}>
            <span>Auto-balance teams as players join</span>
            <Checkbox
              checked={settings.autoBalanceTeams}
              disabled={!settings.teamMode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                patch({ autoBalanceTeams: e.target.checked });
              }}
            />
          </label>

          <label className={styles.setting}>
            <span>
              Anonymous mode
              <span className={styles.settingHint}>
                {" "}
                — hide player names on the scoreboard
              </span>
            </span>
            <Checkbox
              checked={settings.anonymousMode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                patch({ anonymousMode: e.target.checked });
              }}
            />
          </label>

          {/* Chunk 13 — customRoomCode is validated server-side: alphanumeric
              4–8 chars, falls back to the auto-generated 6-char code when
              blank, returns 409 on collision with another live session. */}
          <label className={styles.setting}>
            <span>
              Custom room code
              <span className={styles.settingHint}>
                {" "}
                — leave blank for a random 6-char code
              </span>
            </span>
            <Input
              type='text'
              maxLength={12}
              value={settings.customRoomCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                patch({ customRoomCode: e.target.value.toUpperCase() });
              }}
              className={styles.numberInput}
            />
          </label>

          {/* Chunk 13 — lobby polish, shuffle, and auto-advance toggles. All
              persist onto InteractiveSessionSettings; the deck's defaults seed
              the form via useGameSettings.seedFromDeck. */}
          <label className={styles.setting}>
            <span>Shuffle question order</span>
            <Checkbox
              checked={settings.shuffleQuestions}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                patch({ shuffleQuestions: e.target.checked });
              }}
            />
          </label>

          <label className={styles.setting}>
            <span>Shuffle answer choices</span>
            <Checkbox
              checked={settings.shuffleAnswers}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                patch({ shuffleAnswers: e.target.checked });
              }}
            />
          </label>

          <label className={styles.setting}>
            <span>
              Auto-advance between rounds
              <span className={styles.settingHint}>
                {" "}
                — turn-based only; host doesn&apos;t have to click Next
              </span>
            </span>
            <Checkbox
              checked={settings.autoAdvance}
              disabled={settings.answerSubmissionMode !== "TURN_BASED"}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                patch({ autoAdvance: e.target.checked });
              }}
            />
          </label>

          <label className={styles.setting}>
            <span>Podium duration (seconds)</span>
            <Input
              type='number'
              min={5}
              max={60}
              value={settings.podiumDuration}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                patch({ podiumDuration: e.target.valueAsNumber });
              }}
              className={styles.numberInput}
            />
          </label>

          <label className={styles.setting}>
            <span>Lobby countdown (seconds)</span>
            <Input
              type='number'
              min={0}
              max={30}
              value={settings.lobbyCountdownSeconds}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                patch({ lobbyCountdownSeconds: e.target.valueAsNumber });
              }}
              className={styles.numberInput}
            />
          </label>

          <label className={styles.setting}>
            <span>Allow spectators (no player slot)</span>
            <Checkbox
              checked={settings.spectatorsAllowed}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                patch({ spectatorsAllowed: e.target.checked });
              }}
            />
          </label>
        </div>
      </details>
    </div>
  );
};

const CreateGamePage = () => {
  const navigate = useNavigate();
  const { deckId } = routeApi.useSearch();

  // No deck → pick one. /decks is My Decks, which has Quick Start buttons.
  useEffect(() => {
    if (!deckId) {
      void navigate({ to: "/decks", replace: true });
    }
  }, [deckId, navigate]);

  const { deck, isLoadingDeck, settings, setSettings } =
    useGameSettings(deckId);

  const [createGame, { isLoading: creating, error: createError }] =
    useCreateInteractiveSessionMutation();

  const submit = async () => {
    if (!deckId) return;
    try {
      const trimmedRoomCode = settings.customRoomCode.trim();
      const session = await createGame({
        createInteractiveSessionRequest: {
          deckId,
          format: settings.format,
          showResponses: settings.showResponses,
          timePerQuestion: settings.timePerQuestion,
          speedBonus: settings.speedBonus,
          answerSubmissionMode: settings.answerSubmissionMode,
          maxPlayers: settings.maxPlayers,
          allowGuests: settings.allowGuests,
          allowLateJoin: settings.allowLateJoin,
          showScoresImmediately: settings.showScoresImmediately,
          reactionsEnabled: settings.reactionsEnabled,
          chatEnabled: settings.chatEnabled,
          teamMode: settings.teamMode,
          teamCount: settings.teamMode ? settings.teamCount : undefined,
          autoBalanceTeams: settings.teamMode
            ? settings.autoBalanceTeams
            : undefined,
          anonymousMode: settings.anonymousMode,
          customRoomCode:
            trimmedRoomCode.length > 0 ? trimmedRoomCode : undefined,
          shuffleQuestions: settings.shuffleQuestions,
          shuffleAnswers: settings.shuffleAnswers,
          autoAdvance:
            settings.answerSubmissionMode === "TURN_BASED"
              ? settings.autoAdvance
              : undefined,
          podiumDuration: settings.podiumDuration,
          lobbyCountdownSeconds: settings.lobbyCountdownSeconds,
          spectatorsAllowed: settings.spectatorsAllowed,
        },
      }).unwrap();
      if (session.roomCode) {
        // Gen-2 SessionPage (one page; opens on the lobby stage). The
        // `$sessionId` param carries the room code.
        await navigate({
          to: "/sessions/$sessionId",
          params: { sessionId: session.roomCode },
        });
      }
    } catch (err) {
      console.error("Failed to create game", err);
    }
  };

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    void submit();
  };

  if (!deckId) return null;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Customize your game</h1>
      <p className={styles.authMsg}>
        {isLoadingDeck
          ? "Loading deck…"
          : deck?.name
            ? `Starting "${deck.name}". Adjust the settings, then start.`
            : "Adjust the settings, then start."}
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Settings</h2>
          <SettingsForm
            settings={settings}
            deckDefaultFormat={deck?.defaultSessionFormat}
            onChange={setSettings}
          />
        </section>

        {createError && (
          <p className={styles.errorMsg} role='alert'>
            {extractErrorMessage(createError, "Failed to create game.")}
          </p>
        )}

        <Btn type='submit' className={styles.createBtn} disabled={creating}>
          {creating ? "Creating…" : "Start Game"}
        </Btn>
      </form>

      <Link to='/decks' className={styles.backLink} viewTransition>
        Back to My Decks
      </Link>
    </div>
  );
};

export { CreateGamePage };
