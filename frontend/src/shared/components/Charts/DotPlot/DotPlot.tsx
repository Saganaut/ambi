// Dot plot (lollipop) for small categorical distributions. Each category is a
// row with a dot positioned along a shared track at value/max, plus a thin stem
// from the baseline — a lighter-weight alternative to bars that reads well for
// MCQ option counts. A highlighted datum (correct option) gets the emphasis
// colour. CSS-positioned (no SVG) so it inherits type tokens cleanly.
import type { GeneralChartProps } from "../types";
import styles from "./DotPlot.module.css";

export type DotPlotProps = GeneralChartProps;

const DotPlot = ({
  data,
  total,
  caption,
  renderLabel,
  renderToggle,
  renderMenu,
  renderDragHandle,
  displayAsPercentage = false,
}: DotPlotProps) => {
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
              <div className={styles.optionControls}>
                {renderDragHandle?.(d)}
                {renderLabel ? (
                  renderLabel(d)
                ) : (
                  <span className={styles.label}>{d.text ?? ""}</span>
                )}
                {renderToggle?.(d)}
                {renderMenu?.(d)}
              </div>
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
                {displayAsPercentage && denominator > 0 && (
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
