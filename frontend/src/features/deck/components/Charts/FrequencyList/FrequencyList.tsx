/**
 * Frequency list for free-text aggregations (TEXT_INPUT, Q&A submissions, etc.).
 * Each unique submission is rendered with a count badge; items marked `correct`
 * are highlighted with the success color.
 *
 * Doubles as a placeholder for the future word-cloud visualization — same data
 * shape, more elaborate render.
 */
import styles from "./FrequencyList.module.css";

export interface FrequencyListItem {
  text: string;
  count: number;
  correct?: boolean;
}

export interface FrequencyListProps {
  items: FrequencyListItem[];
  // Optional label rendered above the list.
  caption?: string;
  // Optional explicit total for the count badges (defaults to sum of counts).
  total?: number;
  emptyMessage?: string;
}

const FrequencyList = ({
  items,
  caption,
  total,
  emptyMessage,
}: FrequencyListProps) => {
  if (items.length === 0) {
    return (
      <div className={styles.list}>
        {caption && <div className={styles.caption}>{caption}</div>}
        <p className={styles.empty}>{emptyMessage ?? "No submissions."}</p>
      </div>
    );
  }
  const denominator = total ?? items.reduce((sum, x) => sum + x.count, 0);

  return (
    <div className={styles.list}>
      {caption && <div className={styles.caption}>{caption}</div>}
      <ol className={styles.items}>
        {items.map((it, i) => {
          const sharePct = denominator > 0 ? Math.round((it.count / denominator) * 100) : 0;
          return (
            <li
              // eslint-disable-next-line react-x/no-array-index-key -- frequency rank is the identity
              key={i}
              className={`${styles.item} ${it.correct ? styles.correct : ""}`}>
              <span className={styles.text}>{it.text}</span>
              <span className={styles.count}>
                {it.count}
                {denominator > 0 && (
                  <span className={styles.share}> ({sharePct}%)</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export { FrequencyList };
