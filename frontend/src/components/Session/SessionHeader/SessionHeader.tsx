import { CountdownTimer } from "@/components/Common/CountdownTimer/CountdownTimer";
import styles from "./SessionHeader.module.css";
import { DisplayJoinCode } from "@/components/Games/DisplayJoinCode/DisplayJoinCode";
import { useSession } from "@/pages/SessionPage/useSession";

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
      <DisplayJoinCode code={interactiveSession.roomCode} />
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
