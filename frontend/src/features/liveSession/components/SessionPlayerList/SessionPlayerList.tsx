import { useSession } from "@/features/liveSession/views/SessionPage/useSession";
import styles from "./SessionPlayerList.module.css";
import { PlayerListItem } from "./PlayerListItem";
const SessionPlayerList = () => {
  const { interactiveSession } = useSession();

  return (
    <div className={styles.sessionPlayerList}>
      {interactiveSession.players.map((player: any) => (
        <PlayerListItem key={player.playerId} player={player} />
      ))}
    </div>
  );
};

export { SessionPlayerList };
