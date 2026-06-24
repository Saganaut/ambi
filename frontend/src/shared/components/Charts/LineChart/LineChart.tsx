import { deriveChartStats } from "../adapters/mcq";
import type { GeneralChartProps } from "../types";
import styles from "./LineChart.module.css";

export type LineChartProps = GeneralChartProps;

const W = 100;
const H = 60;
const PAD = 6;

const LineChart = ({
  renderLabel,
  renderToggle,
  renderMenu,
  editor,
  answerSettings,
  chartMode,
}: LineChartProps) => {
  if (chartMode !== "editable") throw Error("Component not editable when it is expected to be so");
  const { question, canAddOption, addOption, isCorrect, handleOptionDragEnd } = editor;
  if (question == null) return <p> no question</p>;

  const { denominator, max, chartData } = deriveChartStats({
    options: question.options,
    correctOptionIds: question.correctOptionIds,
  });
  if (chartMode !== "editable") return;
  const span = Math.max(1, chartData.length - 1);

  const points = chartData.map((datum, i) => {
    const x = PAD + (i / span) * (W - PAD * 2);
    const y = H - PAD - (datum.value / max) * (H - PAD * 2);
    return { x, y, datum: datum, index: i };
  });

  // W === 100, so viewBox x directly equals the CSS left percentage.
  const xPct = (i: number) => PAD + (i / span) * (W - PAD * 2);

  const path = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  console.log("To be implemented", canAddOption, addOption, isCorrect, handleOptionDragEnd);

  return (
    <div className={styles.chart}>
      <div className={styles.valueRow}>
        {chartData.map((datum, i) => (
          <div
            // eslint-disable-next-line react-x/no-array-index-key -- position is the identity
            key={i}
            className={styles.valueItem}
            style={{ left: `${xPct(i).toFixed(2)}%` }}
          >
            <span className={styles.labelValue}>
              {datum.value}
              {answerSettings?.displayResultsAsPercentage && denominator > 0 && (
                <span className={styles.share}>
                  {" "}
                  ({Math.round((datum.value / denominator) * 100)}%)
                </span>
              )}{" "}
              {renderToggle?.(datum)}
            </span>
          </div>
        ))}
      </div>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${W.toString()} ${H.toString()}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Line chart"
      >
        <line className={styles.axis} x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} />
        {chartData.length > 1 && <polyline className={styles.line} points={path} />}
        {points.map((p) => (
          <circle
            key={p.index}
            className={`${styles.marker} ${p.datum.highlight ? styles.highlight : ""}`}
            cx={p.x}
            cy={p.y}
            r={p.datum.highlight ? 2.4 : 1.8}
            style={p.datum.color ? { fill: p.datum.color } : undefined}
          />
        ))}
      </svg>
      <div className={styles.controlsRow}>
        {chartData.map((datum, i) => (
          <div
            // eslint-disable-next-line react-x/no-array-index-key -- position is the identity
            key={i}
            className={styles.controlsItem}
            style={{ left: `${xPct(i).toFixed(2)}%` }}
          >
            <div className={styles.optionControls}>
              {renderLabel ? (
                <>
                  {renderLabel(datum)} {renderMenu?.(datum)}
                </>
              ) : (
                <span className={styles.labelText}>{datum.text ?? ""}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { LineChart };
