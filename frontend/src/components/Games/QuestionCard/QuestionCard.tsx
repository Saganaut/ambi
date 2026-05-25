/**
 * Question chrome: shows the prompt, point value, and a countdown timer bar.
 * Consumed by PlayPage with element-derived props so it works for any
 * scored question kind without a switch on element.kind.
 */
import styles from "./QuestionCard.module.css";

export interface QuestionCardData {
  questionText: string;
  pointValue: number;
  timeLimit: number;     // seconds; 0 = unlimited / no timer
  imageUrl?: string;
}

export interface QuestionCardProps {
  question: QuestionCardData;
  round: number;
  totalRounds: number;
  timeRemaining: number;
  /** When true the round has no countdown — render "Unlimited" instead of a bar. */
  noTimer?: boolean;
}

const QuestionCard = ({
  question,
  round,
  totalRounds,
  timeRemaining,
  noTimer,
}: QuestionCardProps) => {
  const window = question.timeLimit > 0 ? question.timeLimit : 1;
  const pct = Math.max(0, (timeRemaining / window) * 100);
  const urgent = !noTimer && timeRemaining <= 5;

  return (
    <div className={styles.card}>
      <div className={styles.meta}>
        <span className={styles.roundLabel}>
          Round {round + 1} / {totalRounds}
        </span>
        <span className={styles.points}>{question.pointValue} pts</span>
      </div>

      {noTimer ? (
        <span className={styles.timerText}>Unlimited</span>
      ) : (
        <>
          <div className={`${styles.timerTrack} ${urgent ? styles.urgent : ""}`}>
            <div className={styles.timerBar} style={{ width: `${pct}%` }} />
          </div>
          <span
            className={`${styles.timerText} ${urgent ? styles.urgentText : ""}`}>
            {timeRemaining}s
          </span>
        </>
      )}

      {question.imageUrl && (
        <img src={question.imageUrl} alt='' className={styles.image} />
      )}

      <p className={styles.questionText}>{question.questionText}</p>
    </div>
  );
};
export { QuestionCard };
