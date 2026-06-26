import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { useRef } from "react";
import type { ChartProps, ChartSegmentRenderProps } from "../types";
import styles from "./BarChart.module.css";

export type BarChartProps = ChartProps;

export type BarChartSegmentRenderProps = ChartSegmentRenderProps;

const SortableListItem = ({
  sortIndex,
  renderLabel,
  renderToggle,
  renderMenu,
  displayAsPercentage,
  datum,
  highestValue,
  denominator,
}: BarChartSegmentRenderProps) => {
  //TODO: Better fall back here or discriminated union for the type
  const max = highestValue ?? 10;

  const sizePct = (datum.value / max) * 100;
  const sharePct = denominator > 0 ? Math.round((datum.value / denominator) * 100) : 0;

  const { ref: sortableRef } = useSortable({
    id: datum.id,
    index: sortIndex,
  });

  const cardRef = useRef<HTMLLIElement>(null);
  const setCardRef = (node: HTMLLIElement | null) => {
    cardRef.current = node;
    if (typeof sortableRef === "function") sortableRef(node);
  };
  return (
    <li
      ref={setCardRef}
      // eslint-disable-next-line react-x/no-array-index-key -- bar position is the identity
      className={`${styles.row} ${datum.highlight ? styles.highlight : ""}`}
    >
      <div className={styles.optionControls}>
        {renderLabel ? (
          renderLabel(datum)
        ) : (
          <span className={styles.label}>{datum.text ?? ""}</span>
        )}
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={
            {
              "--size": `${sizePct.toFixed(1)}%`,
              "--bar-color": datum.color,
            } as React.CSSProperties
          }
        />{" "}
      </div>
      <span className={styles.value}>
        {" "}
        {renderMenu?.(datum)}
        {datum.value}
        {displayAsPercentage && denominator > 0 && (
          <span className={styles.share}> ({sharePct}%)</span>
        )}{" "}
        {renderToggle?.(datum)}
      </span>
    </li>
  );
};

const BarChart = ({
  renderLabel,
  renderToggle,
  renderMenu,
  onReorder,
  data,
  displayAsPercentage,
  orientation = "horizontal",
}: BarChartProps) => {
  const denominator = data.reduce((sum, datum) => sum + datum.value, 0);
  const highestValue = Math.max(1, ...data.map((datum) => datum.value));
  console.log("TODO: canAddOption, addOption, isCorrect per option");
  return (
    <div className={`${styles.chart} ${styles[orientation]}`}>
      <ul className={styles.bars}>
        <DragDropProvider
          onDragEnd={(event) => {
            onReorder?.(event);
          }}
        >
          {data.map((datum, idx) => (
            <SortableListItem
              key={datum.id}
              highestValue={highestValue}
              denominator={denominator}
              datum={datum}
              displayAsPercentage={displayAsPercentage}
              sortIndex={idx}
              renderToggle={renderToggle}
              renderLabel={renderLabel}
              renderMenu={renderMenu}
            />
          ))}
        </DragDropProvider>
      </ul>
    </div>
  );
};

export { BarChart };
