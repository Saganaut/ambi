import { Leaderboard } from "@/components/Leaderboard/Leaderboard";
import styles from "./SessionLeaderboard.module.css";
const SessionLeaderboard = () => {
  return (
    <div className={styles.sessionLeaderboard}>
      <Leaderboard />
    </div>
  );
};

export { SessionLeaderboard };
