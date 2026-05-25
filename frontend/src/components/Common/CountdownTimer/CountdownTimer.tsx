/**
 * Circular countdown timer: a hollow ring with the seconds remaining shown
 * in the middle. The ring is drawn as a stroked arc whose length tracks the
 * remaining fraction — half the circumference is visible at the midpoint,
 * a quarter at 25% remaining — so the depleting arc gives an at-a-glance
 * "how much time is left" cue without relying on the digit alone. Used by
 * question/lobby flows where the deadline matters more than the absolute
 * clock. Caller resets it by changing `duration` or by giving the element
 * a fresh React key when running it on the same duration twice.
 */
import { useEffect, useRef, useState } from "react";
import styles from "./CountdownTimer.module.css";

const RING_RADIUS = 47;

type CountdownSize = "sm" | "md" | "lg";

interface CountdownTimerProps {
  /** Total countdown length in seconds. */
  duration: number;
  /** When false, the timer freezes at its current value. Defaults to true. */
  running?: boolean;
  /** Fired once when the timer crosses zero. */
  onComplete?: () => void;
  /** Visual size of the timer. Defaults to "md". */
  size?: CountdownSize;
  /** Seconds remaining at/under which the timer flips to the urgent color. */
  urgentThreshold?: number;
  className?: string;
}

const CountdownTimer = ({
  duration,
  running = true,
  onComplete,
  size = "md",
  urgentThreshold = 5,
  className,
}: CountdownTimerProps) => {
  const totalMs = Math.max(0, duration) * 1000;
  const [remainingMs, setRemainingMs] = useState(totalMs);
  const [prevTotalMs, setPrevTotalMs] = useState(totalMs);

  // React 19 "adjust state on prop change" pattern: reset during render so
  // the next paint already shows the new duration.
  if (prevTotalMs !== totalMs) {
    setPrevTotalMs(totalMs);
    setRemainingMs(totalMs);
  }

  // Keep the latest onComplete in a ref so the rAF loop always calls the
  // freshest callback without resetting whenever the caller passes a fresh
  // inline function.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!running || totalMs === 0) return;

    let rafId = 0;
    let lastFrame = performance.now();

    const tick = (now: number) => {
      const delta = now - lastFrame;
      lastFrame = now;
      const transition = { crossed: false };
      setRemainingMs((prev) => {
        if (prev === 0) return 0;
        const next = Math.max(0, prev - delta);
        if (next === 0) transition.crossed = true;
        return next;
      });
      if (transition.crossed) {
        onCompleteRef.current?.();
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [running, totalMs]);

  const progress = totalMs > 0 ? remainingMs / totalMs : 0;
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const urgent = remainingMs > 0 && secondsLeft <= urgentThreshold;

  const circumference = 2 * Math.PI * RING_RADIUS;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className={[
        styles.timer,
        styles[size],
        urgent ? styles.urgent : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role='timer'
      aria-live='off'
      aria-label={`${secondsLeft.toString()} seconds remaining`}>
      <svg
        className={styles.ring}
        viewBox='0 0 100 100'
        xmlns='http://www.w3.org/2000/svg'
        aria-hidden='true'>
        <circle
          className={styles.ringStroke}
          cx='50'
          cy='50'
          r={RING_RADIUS}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className={styles.value}>{secondsLeft}</span>
    </div>
  );
};

export { CountdownTimer };
