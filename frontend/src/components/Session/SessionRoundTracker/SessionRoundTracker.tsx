import { useSession } from "@/pages/SessionPage/useSession";
import styles from "./SessionRoundTracker.module.css";
import { SessionRoundThumbnail } from "./SessionRoundThumbnail";
const SessionRoundTracker = () => {
  const { interactiveSession } = useSession();
  console.log("interactiveSession", interactiveSession);
  return (
    <div className={styles.sessionRoundTracker}>
      {interactiveSession.deckSnapshot.map((element, index) => {
        console.log("index", index);
        return (
          <SessionRoundThumbnail
            isActive={index == interactiveSession.currentRound}
            key={element.id}
            element={element}
          />
        );
      })}
    </div>
  );
};

export { SessionRoundTracker };
