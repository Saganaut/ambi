/**
 * Live player score list, sorted by descending score.
 * Rendered during active play so all participants can track standings.
 * The local player's row is highlighted for quick self-identification.
 *
 * Identity is session-scoped: every player is identified by the
 * {@link InteractiveSessionPlayerResponse.playerId} session-scoped handle — never
 * the underlying account userId.
 *
 * Optional dashboard extensions:
 *  - `answeredPlayerIds`: shows ✓ next to players who've submitted for the current round.
 *  - `isHost` + `onBootPlayer`: shows a Boot button on other players' rows when the
 *    viewer is the host.
 */
import { Btn } from "@/components/Common/Buttons/Btn";
import styles from "./ScoreBoard.module.css";
import type {
  InteractiveSessionPlayerResponse,
  Team,
} from "../../../store/AmbiApi";

export interface ScoreBoardProps {
  players: InteractiveSessionPlayerResponse[];
  // Session-scoped playerId of the viewer, used to highlight their row.
  currentPlayerId?: string;
  // When true the host configured scores to stay hidden during play — render the
  // player list with no rank ordering and no point values.
  hideScores?: boolean;
  // Session-scoped playerIds that have already submitted for the current round.
  answeredPlayerIds?: string[];
  // Session-scoped playerIds whose WebSocket session has dropped.
  // NOTE: global /topic/presence still broadcasts userIds; until that surface
  // migrates per-session, callers pass an empty list and the offline indicator
  // silently no-ops. Tracked as a follow-up to the InteractiveSession DTO
  // refactor.
  offlinePlayerIds?: string[];
  // Whether the viewer is the host (controls whether boot buttons render).
  isHost?: boolean;
  // Called when the host clicks Boot — receives the target's session-scoped playerId.
  onBootPlayer?: (playerId: string) => void;
  // Team-mode chunk 12: when populated, each player row renders a small
  // team color dot + name chip under their score. Falsy/empty disables the
  // affordance entirely so individual mode is unaffected.
  teams?: Team[];
}

const ScoreBoard = ({
  players,
  currentPlayerId,
  hideScores,
  answeredPlayerIds,
  offlinePlayerIds,
  isHost,
  onBootPlayer,
  teams,
}: ScoreBoardProps) => {
  const sorted = hideScores
    ? players
    : [...players].sort((a, b) => b.score - a.score);

  const answeredSet = new Set(answeredPlayerIds ?? []);
  const offlineSet = new Set(offlinePlayerIds ?? []);
  const showAnswered = !!answeredPlayerIds;
  const teamById = new Map((teams ?? []).map((t) => [t.id ?? "", t]));
  const teamModeActive = teamById.size > 0;

  return (
    <section
      className={styles.board}
      aria-label={hideScores ? "Players" : "Scores"}>
      <h3 className={styles.title}>{hideScores ? "Players" : "Scores"}</h3>
      <ol className={styles.list}>
        {sorted.map((p, i) => {
          const playerId = p.playerId;
          const isSelf = !!playerId && playerId === currentPlayerId;
          const answered = !!playerId && answeredSet.has(playerId);
          const isOffline = !!playerId && offlineSet.has(playerId);
          const team =
            teamModeActive && p.teamId ? teamById.get(p.teamId) : null;
          return (
            <li
              key={playerId}
              className={`${styles.row} ${isSelf ? styles.me : ""} ${isOffline ? styles.offline : ""}`}>
              {!hideScores && <span className={styles.rank}>{i + 1}</span>}
              <span className={styles.name}>
                {p.user.name}
                {team && (
                  <span
                    className={styles.teamChip}
                    style={
                      {
                        "--team-color": team.color ?? "var(--bg-subtle)",
                      } as React.CSSProperties
                    }
                    title={team.name ?? "Team"}>
                    <span className={styles.teamDot} aria-hidden='true' />
                    {team.name}
                  </span>
                )}
              </span>
              {p.user.guest && <span className={styles.guest}>guest</span>}
              {/* Chunk 13 — Kahoot-style streak chip. Visible at 2x+; the
                  backend resets on a wrong answer, so a fresh round keeps
                  the chip until the player either misses or finishes. */}
              {p.currentStreak >= 2 && (
                <span
                  className={styles.streakChip}
                  title={`${p.currentStreak.toString()} in a row`}>
                  {p.currentStreak}x 🔥
                </span>
              )}
              {isOffline && (
                <span className={styles.offlineLabel} title='Disconnected'>
                  offline
                </span>
              )}
              {showAnswered && (
                <span
                  className={`${styles.statusDot} ${answered ? styles.answered : styles.pending}`}
                  aria-label={answered ? "Answered" : "Still answering"}
                  title={answered ? "Answered" : "Still answering"}>
                  {answered ? "✓" : "…"}
                </span>
              )}
              {!hideScores && <span className={styles.score}>{p.score}</span>}
              {isHost && !isSelf && onBootPlayer && playerId && (
                <Btn
                  size='sm'
                  variant='error'
                  type='button'
                  className={styles.bootBtn}
                  onClick={() => {
                    onBootPlayer(playerId);
                  }}
                  aria-label={`Remove ${p.user.name ?? "player"} from the interactiveSession`}>
                  Boot
                </Btn>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};
export { ScoreBoard };
