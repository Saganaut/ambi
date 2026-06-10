import { useSession } from "@/features/liveSession/hooks/useSession";
import styles from "./SessionRoundTracker.module.css";
import { SessionRoundThumbnail } from "./SessionRoundThumbnail";
const SessionRoundTracker = () => {
  const { interactiveSession } = useSession();
  console.log("interactiveSession", interactiveSession);
  return (
    <div className={styles.sessionRoundTracker}>
      {interactiveSession.deckSnapshot.map((slide: any, index: any) => {
        console.log("index", index);
        return (
          <SessionRoundThumbnail
            isActive={index == interactiveSession.currentRound}
            key={slide.id}
            slide={slide}
          />
        );
      })}
    </div>
  );
};

export { SessionRoundTracker };
