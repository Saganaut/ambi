// End-of-session board state (status RESULTS / FINISHED). The format decides the
// chrome, matching the session spec: GAME ends on standings (ranked players by
// score); PRESENTATION has no leaderboard, so it closes on an aggregated summary
// rather than a ranking. Same component, branched by format — not two trees.
//
// Reads the live player roster off the session snapshot and ranks locally. When
// wired off mock data this can swap to the authoritative final placements from
// the /results endpoint, but the shape (player + score) is the same.
import styles from "./BoardOverallResults.module.css";

interface BoardOverallResultsProps {
  session: any;
}

const BoardOverallResults = ({ session }: BoardOverallResultsProps) => {
  if (session.format === "PRESENTATION") {
    return (
      <div className={styles.boardOverallResults}>
        <h1 className={styles.heading}>Thanks for taking part</h1>
        <p className={styles.subhead}>
          {session.totalRounds} questions · {session.players.length}{" "}
          participants
        </p>
      </div>
    );
  }

  const ranked = [...session.players].sort((a, b) => b.score - a.score);

  return (
    <div className={styles.boardOverallResults}>
      <h1 className={styles.heading}>Final standings</h1>
      <ol className={styles.standings}>
        {ranked.map((player, idx) => (
          <li key={player.playerId} className={styles.row}>
            <span className={styles.place}>{idx + 1}</span>
            <span className={styles.name}>{player.user.name ?? "Player"}</span>
            <span className={styles.score}>{player.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

export { BoardOverallResults };
