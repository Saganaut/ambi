// Host-facing card that shows the 6-character room code so players in the
// room can type it into JoinWithCode. Pairs with DisplayQR (same shared
// "share this game" panel); kept as a separate component so a host can show
// either or both without reaching into the Lobby internals.
import styles from "./DisplayJoinCode.module.css";

interface DisplayJoinCodeProps {
  code: string;
  label?: string;
  hint?: string;
  className?: string;
}

const DisplayJoinCode = ({
  code,
  label,
  hint,
  className,
}: DisplayJoinCodeProps) => {
  return (
    <div
      className={[styles.card, className].filter(Boolean).join(" ")}
      aria-label={`${label}: ${code}`}>
      {label != null && <span className={styles.label}>{label}</span>}
      <span className={styles.code}>{code}</span>
      {hint != null && <span className={styles.hint}>{hint}</span>}
    </div>
  );
};

export { DisplayJoinCode };
export type { DisplayJoinCodeProps };
