import { useState } from "react";
import { useGetLeaderboardQuery } from "../../store/AmbiApi";
import styles from "./Leaderboard.module.css";
import { CollapseBtn } from "../Common/Buttons/CollapseBtn";

const Leaderboard = () => {
  const { data, isLoading, isError } = useGetLeaderboardQuery({
    page: 0,
    size: 10,
  });

  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={styles.leaderboardContainer}>
      <div className={styles.leaderboard}>
        <div className={styles.leaderboardHeader}>
          <h3 className={styles.leaderboardTitle}>Leaderboard </h3>
          <CollapseBtn isCollapsed={isCollapsed} collapse={setIsCollapsed} />
        </div>
        {isLoading ? (
          <div>Loading</div>
        ) : isError ? (
          <div>Error</div>
        ) : (
          <div
            className={`${styles.playerList} ${isCollapsed ? styles.isCollapsed : ""}`}>
            {data?.map((player) => (
              <div key={player.id} className={styles.playerRow}>
                <p>{player.userName}</p>
                <p>{player.stats?.totalPoints}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { Leaderboard };
