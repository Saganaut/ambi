import type { ChartProps } from "../types";
import styles from "./DotPlot.module.css";

export type DotPlotProps = ChartProps;

const DotPlot = ({
  renderLabel,
  renderToggle,
  renderMenu,
  data,
  displayAsPercentage,
}: DotPlotProps) => {
  const denominator = data.reduce((sum, datum) => sum + datum.value, 0);
  const max = Math.max(1, ...data.map((datum) => datum.value));
  console.log("TODO: canAddOption, addOption, isCorrect per option");
  return (
    <div className={styles.chart}>
      <ul className={styles.rows}>
        {data.map((datum, i) => {
          const posPct = (datum.value / max) * 100;
          const sharePct = denominator > 0 ? Math.round((datum.value / denominator) * 100) : 0;
          return (
            <li
              // eslint-disable-next-line react-x/no-array-index-key -- position is the identity
              key={i}
              className={`${styles.row} ${datum.highlight ? styles.highlight : ""}`}
            >
              <div className={styles.optionControls}>
                {renderLabel ? (
                  renderLabel(datum)
                ) : (
                  <span className={styles.label}>{datum.text ?? ""}</span>
                )}
                {renderToggle?.(datum)}
                {renderMenu?.(datum)}
              </div>
              <div className={styles.track}>
                <span
                  className={styles.stem}
                  style={{ width: `${posPct.toFixed(1)}%` }}
                  aria-hidden="true"
                />
                <span
                  className={styles.dot}
                  style={
                    {
                      left: `${posPct.toFixed(1)}%`,
                      "--dot-color": datum.color,
                    } as React.CSSProperties
                  }
                />
              </div>
              <span className={styles.value}>
                {datum.value}
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
