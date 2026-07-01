import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import styles from "./SessionHeader.module.css";

const SessionRoundDisplay = () => {
  // The Gen-2 read model carries the current slide directly (no deck object /
  // round index), so the header names the live slide rather than the deck.
  const { currentSlide } = useLiveSessionQuery();

  return (
    <div className={styles.sessionRoundDisplay}>
      {currentSlide?.section && <div>{currentSlide.section}</div>}
      <div>{currentSlide?.title ?? "Lobby"}</div>
    </div>
  );
};

const SessionInfoDisplay = () => {
  const { publicId } = useLiveSessionQuery();

  return (
    <div className={styles.sessionInfoDisplay}>
      <span>Join code: {publicId ?? ""}</span>
    </div>
  );
};

const SessionHeader = () => {
  return (
    <div className={styles.sessionHeader}>
      <SessionRoundDisplay />
      <SessionInfoDisplay />
    </div>
  );
};

export { SessionHeader };
