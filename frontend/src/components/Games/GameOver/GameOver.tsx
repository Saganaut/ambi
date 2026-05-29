/**
 * Final results screen shown after a game ends.
 * Renders the top-3 podium, a full placement table, and navigation back to the hub.
 * Data comes from the GAME_OVER WebSocket payload stored in the game Redux slice.
 */
import { Link } from "@tanstack/react-router";
import styles from "./GameOver.module.css";
import { TeamPodium } from "../TeamPodium/TeamPodium";
import type { PlayerPlacementResponse, Team } from "../../../store/AmbiApi";

interface GameOverProps {
  placements: PlayerPlacementResponse[];
  // Session-scoped playerId of the viewer; their row gets the "me" highlight.
  currentPlayerId?: string;
  // Team-mode chunk 12: when provided alongside placements that carry teamId,
  // GameOver renders a team podium above the individual podium. Empty array
  // (or undefined) preserves the original individual-only layout.
  teams?: Team[];
}

const PLACE_LABELS = ["1st", "2nd", "3rd"];

/**
 * Chunk 13 — per-player engagement chips on the placement card. Numbers come
 * straight off `PlayerPlacementResponse`, which `InteractiveSessionService.endGame`
 * snapshots off the live `InteractiveSessionPlayer` at game-end time. Each
 * chip is suppressed when its value is zero or undefined so a player who
 * never streaked / never sent a reaction doesn't get noisy "0x" badges.
 */
const PlacementChips = ({ p }: { p: PlayerPlacementResponse }) => {
  const accuracyPct =
    typeof p.endStats?.accuracy === "number" && p.totalQuestions
      ? Math.round(p.endStats.accuracy * 100)
      : null;
  const longestStreak = p.endStats?.longestStreak ?? 0;
  const speedBonusTotal = p.speedBonusTotal ?? 0;
  const reactionsSent = p.endStats?.reactionsSent ?? 0;
  if (
    accuracyPct === null &&
    longestStreak === 0 &&
    speedBonusTotal === 0 &&
    reactionsSent === 0
  ) {
    return null;
  }
  return (
    <div className={styles.chips}>
      {accuracyPct !== null && (
        <span className={styles.chip} title='Answer accuracy'>
          {accuracyPct}% accuracy
        </span>
      )}
      {longestStreak >= 2 && (
        <span
          className={`${styles.chip} ${styles.chipStreak}`}
          title='Longest in-game streak'>
          {longestStreak}x streak 🔥
        </span>
      )}
      {speedBonusTotal > 0 && (
        <span
          className={`${styles.chip} ${styles.chipSpeed}`}
          title='Total speed-bonus points'>
          +{speedBonusTotal} speed
        </span>
      )}
      {reactionsSent > 0 && (
        <span className={styles.chip} title='Reactions sent'>
          {reactionsSent} reactions
        </span>
      )}
    </div>
  );
};

const GameOver = ({ placements, currentPlayerId, teams }: GameOverProps) => {
  const top3 = placements.slice(0, 3);
  const rest = placements.slice(3);
  const teamModeActive =
    !!teams && teams.length > 0 && placements.some((p) => !!p.teamId);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Game Over</h1>

      {teamModeActive && (
        <TeamPodium
          placements={placements}
          teams={teams}
          currentPlayerId={currentPlayerId}
        />
      )}

      <div className={styles.podium}>
        {top3.map((p, i) => (
          <div
            key={p.playerId}
            className={`${styles.place} ${styles[`place${i + 1}`]} ${p.playerId === currentPlayerId ? styles.me : ""}`}>
            <span className={styles.placeLabel}>{PLACE_LABELS[i]}</span>
            <span className={styles.placeName}>{p.user?.name}</span>
            <span className={styles.placeScore}>{p.finalScore ?? 0} pts</span>
            <PlacementChips p={p} />
          </div>
        ))}
      </div>

      {rest.length > 0 && (
        <ol className={styles.restList} start={4}>
          {rest.map((p) => (
            <li
              key={p.playerId}
              className={`${styles.restRow} ${p.playerId === currentPlayerId ? styles.me : ""}`}>
              <div className={styles.restRowMain}>
                <span className={styles.restName}>{p.user?.name}</span>
                {p.user?.guest && (
                  <span className={styles.guestBadge}>guest</span>
                )}
                <span className={styles.restScore}>
                  {p.finalScore ?? 0} pts
                </span>
              </div>
              <PlacementChips p={p} />
            </li>
          ))}
        </ol>
      )}

      <div className={styles.footer}>
        <Link to='/decks' className={styles.footerLink} viewTransition>
          Play Again
        </Link>
        <Link to='/' className={styles.footerLink} viewTransition>
          Home
        </Link>
      </div>
    </div>
  );
};

export { GameOver };
