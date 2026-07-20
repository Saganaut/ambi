import { useEffect, useState } from "react";

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

/** `m:ss` from a remaining-time interval, clamped at zero. */
const formatRemaining = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes)}:${String(seconds).padStart(2, "0")}`;
};

/**
 * Countdown for a timed round (ADR 002), rendered from the broadcast
 * server-authoritative deadline — every client shows the same clock the backend
 * will enforce. Shown only while the round accepts submissions; frozen at
 * `deadline - pausedAt` while the host (or a host disconnect) has it paused.
 */
const SessionTimerDisplay = () => {
  const { phase, roundDeadline, timerPausedAt } = useLiveSessionQuery();
  const accepting = phase === "SUBMIT" || phase === "SUBMIT_LIVE";
  const running = accepting && roundDeadline != null && timerPausedAt == null;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => {
      clearInterval(timer);
    };
  }, [running]);

  if (!accepting || roundDeadline == null) return null;

  const deadline = Date.parse(roundDeadline);
  const remaining =
    timerPausedAt != null ? deadline - Date.parse(timerPausedAt) : deadline - now;

  return (
    <div className={styles.sessionTimer} role="timer" aria-label="Round timer">
      <span>{formatRemaining(remaining)}</span>
      {timerPausedAt != null && <span className={styles.timerPaused}>paused</span>}
    </div>
  );
};

const SessionInfoDisplay = () => {
  const { roomCode, showRoomCodeInHeader } = useLiveSessionQuery();

  if (!showRoomCodeInHeader) return null;

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
      <SessionTimerDisplay />
      <SessionInfoDisplay />
    </div>
  );
};

export { SessionHeader };
