// Dot plot (lollipop) for small categorical distributions. Each category is a
// row with a dot positioned along a shared track at value/max, plus a thin stem
// from the baseline — a lighter-weight alternative to bars that reads well for
// MCQ option counts. A highlighted datum (correct option) gets the emphasis
// colour. CSS-positioned (no SVG) so it inherits type tokens cleanly.
import type { ChartProps } from "../types";
import styles from "./DotPlot.module.css";

export interface DotPlotProps extends ChartProps {
  total?: number;
}

const DotPlot = ({ data, total, caption, renderLabel }: DotPlotProps) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  const denominator = total ?? data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className={styles.chart}>
      {caption && <div className={styles.caption}>{caption}</div>}
      <ul className={styles.rows}>
        {data.map((d, i) => {
          const posPct = (d.value / max) * 100;
          const sharePct =
            denominator > 0 ? Math.round((d.value / denominator) * 100) : 0;
          return (
            <li
              // eslint-disable-next-line react-x/no-array-index-key -- position is the identity
              key={i}
              className={`${styles.row} ${d.highlight ? styles.highlight : ""}`}
            >
              {renderLabel ? (
                renderLabel(d)
              ) : (
                <span className={styles.label}>{d.label}</span>
              )}
              <div className={styles.track}>
                <span
                  className={styles.stem}
                  style={{ width: `${posPct.toFixed(1)}%` }}
                  aria-hidden='true'
                />
                <span
                  className={styles.dot}
                  style={
                    {
                      left: `${posPct.toFixed(1)}%`,
                      "--dot-color": d.color,
                    } as React.CSSProperties
                  }
                />
              </div>
              <span className={styles.value}>
                {d.value}
                {denominator > 0 && (
                  <span className={styles.share}> ({sharePct}%)</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export { DotPlot };
