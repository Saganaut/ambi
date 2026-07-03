import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { RichTextDisplay } from "@/shared/components/Forms/Input/RichTextDisplay/RichTextDisplay";
import styles from "./SessionHeader.module.css";

const SessionRoundDisplay = () => {
  // The Gen-2 read model carries the current slide directly (no deck object /
  // round index), so the header names the live slide rather than the deck.
  const { currentSlide } = useLiveSessionQuery();

  return (
    <div className={styles.sessionRoundDisplay}>
      {currentSlide?.section && <div>{currentSlide.section}</div>}
      <div>
        <RichTextDisplay value={currentSlide?.title ?? "Lobby"} />
      </div>
    </div>
  );
};

const SessionInfoDisplay = () => {
  const { roomCode } = useLiveSessionQuery();

  return (
    <div className={styles.sessionInfoDisplay}>
      <span>Join code: {roomCode ?? ""}</span>
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
