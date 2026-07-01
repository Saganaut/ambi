import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import styles from "./SessionPlayerList.module.css";
import { PlayerListItem } from "./PlayerListItem";

const SessionPlayerList = () => {
  // `roster` is the ordered participant ids; the participant records live in the
  // `participants` map. Rendering off the ordered ids keeps the list stable.
  const { roster, participants } = useLiveSessionQuery();

  return (
    <div className={styles.sessionPlayerList}>
      {roster.map((participantId) => {
        const participant = participants[participantId];
        if (!participant) return null;
        return (
          <PlayerListItem key={participantId} participant={participant} />
        );
      })}
    </div>
  );
};

export { SessionPlayerList };
