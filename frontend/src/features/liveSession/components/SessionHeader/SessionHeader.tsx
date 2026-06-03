import { CountdownTimer } from "@/features/liveSession/components/CountdownTimer/CountdownTimer";
import styles from "./SessionHeader.module.css";
import { useSession } from "@/features/liveSession/views/SessionPage/useSession";

const SessionTimer = () => {
  return (
    <div className={styles.sessionTimer}>
      <CountdownTimer size={"sm"} duration={30} />
    </div>
  );
};

const SessionRoundDisplay = () => {
  const { interactiveSession, currentDeck } = useSession();

  return (
    <div className={styles.sessionRoundDisplay}>
      <div>Deck Name:{currentDeck?.name ?? ""}</div>
      <div>Round: {interactiveSession.currentRound}</div>
    </div>
  );
};

const SessionInfoDisplay = () => {
  const { interactiveSession } = useSession();

  return (
    <div className={styles.sessionInfoDisplay}>
      {/* TODO(migration): stubbed pending liveSession migration. Was
          <DisplayJoinCode> from the removed @components/Games tree; plain code
          for now. */}
      <span>Join code: {interactiveSession.roomCode}</span>
    </div>
  );
};

const SessionHeader = () => {
  const { interactiveSession } = useSession();

  return (
    <div className={styles.sessionHeader}>
      <SessionRoundDisplay />
      {interactiveSession.settings.timePerQuestion && <SessionTimer />}
      <SessionInfoDisplay />
    </div>
  );
};

export { SessionHeader };
