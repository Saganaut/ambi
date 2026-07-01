// The in-session leaderboard (right sidebar). Reads the live scoreboard straight
// from the session read model — the same `ScoreboardEntry[]` the backend ranks and
// pushes over the session topic — so every player sees identical, live-updating
// standings. Like `SessionPlayerList`, it composes `useLiveSessionQuery` rather than
// fetching; the backend owns the ranking, so we order rows by the server-provided
// `rank` field rather than computing our own.
import { useState } from "react";

import { CollapseBtn } from "@ui/Buttons/CollapseBtn";

import { useLiveSessionQuery } from "../../hooks/useLiveSessionQuery";
import styles from "./SessionLeaderboard.module.css";

const SessionLeaderboard = () => {
  const { scoreboard } = useLiveSessionQuery();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Prefer the server's rank; fall back to list order when absent.
  const ranked = [...scoreboard].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  return (
    <div className={styles.leaderboardContainer}>
      <div className={styles.leaderboard}>
        <div className={styles.leaderboardHeader}>
          <h3 className={styles.leaderboardTitle}>Leaderboard</h3>
          <CollapseBtn isCollapsed={isCollapsed} collapse={setIsCollapsed} />
        </div>
        <ol
          className={[styles.playerList, isCollapsed && styles.isCollapsed]
            .filter(Boolean)
            .join(" ")}>
          {ranked.length === 0 ? (
            <li className={styles.emptyState}>No scores yet</li>
          ) : (
            ranked.map((entry, idx) => (
              <li key={entry.participantId ?? idx} className={styles.playerRow}>
                <span className={styles.place}>{entry.rank ?? idx + 1}</span>
                <span className={styles.name}>
                  {entry.displayName ?? "Player"}
                </span>
                <span className={styles.score}>{entry.points ?? 0}</span>
              </li>
            ))
          )}
        </ol>
      </div>
    </div>
  );
};

export { SessionLeaderboard };
