import { AddOptionPopover } from "../AddOptionButton/AddOptionPopover";
import type { ChartProps } from "../Chart.types";
import { CorrectBadge } from "../CorrectBadge/CorrectBadge";
import { OptionImage } from "../OptionImage/OptionImage";
import { resolveDatumColor } from "../optionPalette";
import styles from "./DotPlot.module.css";

export type DotPlotProps = ChartProps;

const DotPlot = ({
  renderLabelWithMenu,
  renderMenu,
  data,
  displayAsPercentage,
  addOption,
  canAddOption,
}: DotPlotProps) => {
  const denominator = data.reduce((sum, datum) => sum + datum.value, 0);
  const max = Math.max(1, ...data.map((datum) => datum.value));
  return (
    <div className={styles.chart}>
      <ul className={styles.rows}>
        {data.map((datum, index) => {
          const posPct = (datum.value / max) * 100;
          const sharePct = denominator > 0 ? Math.round((datum.value / denominator) * 100) : 0;
          const row = (
            <li
              // eslint-disable-next-line react-x/no-array-index-key -- position is the identity
              key={index}
              className={`${styles.row} ${datum.highlight ? styles.highlight : ""}`}
              style={
                { "--dot-color": resolveDatumColor(datum.color, index) } as React.CSSProperties
              }
            >
              <div className={styles.optionControls}>
                <OptionImage src={datum.imageUrl} alt={datum.imageAlt} fallbackSeed={datum.id} />
                {renderLabelWithMenu ? (
                  renderLabelWithMenu(datum)
                ) : (
                  <span className={styles.label}>{datum.text ?? ""}</span>
                )}
              </div>
              <div className={styles.track}>
                <span
                  className={styles.stem}
                  style={{ width: `${posPct.toFixed(1)}%` }}
                  aria-hidden="true"
                />
                <span className={styles.dot} style={{ left: `${posPct.toFixed(1)}%` }} />
              </div>
              <span className={styles.value}>
                {datum.value}
                {displayAsPercentage && denominator > 0 && (
                  <span className={styles.share}> ({sharePct}%)</span>
                )}
              </span>
              {renderMenu && (
                <span className={styles.rowActions}>
                  <CorrectBadge isCorrect={datum.isCorrect} />
                  {renderMenu(datum)}
                </span>
              )}
            </li>
          );

          return index === data.length - 1 && addOption && canAddOption ? (
            <AddOptionPopover key={datum.id} anchor={row} onAdd={addOption} focusableAnchor />
          ) : (
            row
          );
        })}
      </ul>
    </div>
  );
};

export { DotPlot };
