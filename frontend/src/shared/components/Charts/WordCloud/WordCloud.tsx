// Word cloud of submitted terms sized by frequency — for TEXT (word-cloud
// mode), FOLLOW_UP and Q&A responses. A restrained, deterministic cloud rather
// than a packed layout: words flow center-out in a wrapped line (the highest
// frequency lands mid-cloud, tapering to the edges), all in one ink with
// magnitude carried by font size + opacity (a sequential encoding — never a
// rainbow). Each word is its own label; hovering or focusing a word reveals
// its exact count (share, when `displayAsPercentage`).
import type { ChartProps } from "../Chart.types";
import type { ChartDatum } from "../Chart.types";
import styles from "./WordCloud.module.css";

export type WordCloudProps = ChartProps & {
  /**
   * False holds every word hidden so a wrapper can stagger them in on mount
   * (see WordCloudChart). Live surfaces leave it at the default.
   */
  revealed?: boolean;
};

/** Per-word offset of the mount reveal, in render order. */
const REVEAL_STAGGER_MS = 45;

/**
 * Deterministic center-weighted order: frequency-sorted words are dealt
 * alternately to the front and back, so the biggest word sits mid-array and
 * sizes taper toward both edges once the line wraps.
 */
const centerWeighted = (data: ChartDatum[]): ChartDatum[] => {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const out: ChartDatum[] = [];
  for (const [index, datum] of sorted.entries()) {
    if (index % 2 === 0) out.unshift(datum);
    else out.push(datum);
  }
  return out;
};

const WordCloud = ({ data, displayAsPercentage, caption, revealed = true }: WordCloudProps) => {
  const max = Math.max(1, ...data.map((datum) => datum.value));
  const denominator = data.reduce((sum, datum) => sum + datum.value, 0);
  const ordered = centerWeighted(data);

  return (
    <figure className={styles.chart}>
      <ul className={styles.cloud}>
        {ordered.map((datum, index) => {
          // √-scale so area (not height) tracks the count — keeps mid-ranked
          // words legible instead of collapsing everything below the leader.
          const scale = Math.sqrt(datum.value / max);
          const share = denominator > 0 ? Math.round((datum.value / denominator) * 100) : 0;
          const detail = displayAsPercentage ? `${share.toString()}%` : datum.value.toString();
          return (
            <li
              key={datum.id}
              className={[
                styles.word,
                revealed ? styles.revealed : "",
                datum.highlight ? styles.highlight : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                {
                  "--word-scale": scale.toFixed(3),
                  "--reveal-delay": `${(index * REVEAL_STAGGER_MS).toString()}ms`,
                } as React.CSSProperties
              }
            >
              <button
                type="button"
                className={styles.wordButton}
                aria-label={`${datum.text ?? datum.id}: ${detail}`}
              >
                {datum.text ?? datum.id}
                <span className={styles.count} aria-hidden="true">
                  {detail}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
};

export { WordCloud };
