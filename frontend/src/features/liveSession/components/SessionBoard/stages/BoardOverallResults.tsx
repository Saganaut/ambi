// End-of-session board state (status FINISHED / CANCELLED). Closes the show on the
// final standings — participants ranked by score. The scoreboard is authoritative
// (the backend ranks it), so this renders it in order rather than re-sorting.
import type { ScoreboardEntry } from "../../../store/liveSessionApi.gen";
import styles from "./BoardOverallResults.module.css";

interface BoardOverallResultsProps {
  /** The final scoreboard, already ranked by the backend. */
  standings: ScoreboardEntry[];
}

const BoardOverallResults = ({ standings }: BoardOverallResultsProps) => {
  // Prefer the server's rank; fall back to list order when absent.
  const ranked = [...standings].sort(
    (a, b) => (a.rank ?? 0) - (b.rank ?? 0),
  );

  return (
    <div className={styles.boardOverallResults}>
      <h1 className={styles.heading}>Final standings</h1>
      <ol className={styles.standings}>
        {ranked.map((entry, idx) => (
          <li key={entry.participantId ?? idx} className={styles.row}>
            <span className={styles.place}>{entry.rank ?? idx + 1}</span>
            <span className={styles.name}>
              {entry.displayName ?? "Player"}
            </span>
            <span className={styles.score}>{entry.points ?? 0}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

export { BoardOverallResults };
