import { useSortable } from "@dnd-kit/react/sortable";
import { useRef } from "react";
import { DragDropWrapper } from "../../Wrappers/DragDropWrapper";
import { AddOptionButton } from "../AddOptionButton/AddOptionButton";
import type { ChartProps, ChartSegmentRenderProps, MenuAlign } from "../Chart.types";
import { OptionImage } from "../OptionImage/OptionImage";
import { resolveDatumColor } from "../optionPalette";
import styles from "./BarChart.module.css";

export type BarChartProps = ChartProps;

export type BarChartSegmentRenderProps = ChartSegmentRenderProps & {
  /** Popover side for this row's menu — "end" for right-half vertical columns. */
  menuAlign?: MenuAlign;
  /** Bar growth direction — picks the in-bar image anchor (left vs. base). */
  orientation?: "horizontal" | "vertical";
};

const SortableListItem = ({
  sortIndex,
  renderLabel,
  renderToggle,
  renderMenu,
  displayAsPercentage,
  datum,
  highestValue,
  denominator,
  menuAlign,
  orientation = "horizontal",
}: BarChartSegmentRenderProps) => {
  const max = Math.max(1, highestValue ?? 1);

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
    <li ref={setCardRef} className={`${styles.row} ${datum.highlight ? styles.highlight : ""}`}>
      <div className={styles.optionControls}>
        {renderLabel ? renderLabel(datum) : <span className={styles.label}>{datum.text ?? ""}</span>}
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={
            {
              "--size": `${sizePct.toFixed(1)}%`,
              "--bar-color": resolveDatumColor(datum.color, sortIndex),
            } as React.CSSProperties
          }
        />
        <OptionImage
          src={datum.imageUrl}
          alt={datum.imageAlt}
          variant={orientation === "vertical" ? "barVertical" : "barHorizontal"}
        />
      </div>
      <span className={styles.value}>
        {datum.value}
        {displayAsPercentage && denominator > 0 && <span className={styles.share}> ({sharePct}%)</span>}
      </span>
      {(renderToggle ?? renderMenu) && (
        <span className={styles.rowActions}>
          {renderToggle?.(datum)}
          {renderMenu?.(datum, menuAlign)}
        </span>
      )}
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
  addOption,
  canAddOption,
}: BarChartProps) => {
  const denominator = data.reduce((sum, datum) => sum + datum.value, 0);
  const highestValue = Math.max(1, ...data.map((datum) => datum.value));
  // Vertical columns are narrow popover anchors: right-half columns open
  // their menu leftward so it stays inside the canvas. Horizontal rows span
  // the full width, so the default alignment is fine.
  const menuAlignFor = (index: number): MenuAlign | undefined =>
    orientation === "vertical" && index > (data.length - 1) / 2 ? "end" : undefined;
  // Horizontal bars thicken when any option carries an image so the in-bar
  // thumbnail is legible; all bars grow together to stay aligned.
  const hasImages = data.some((datum) => datum.imageUrl != null);
  return (
    <div
      className={`${styles.chart} ${styles[orientation]} ${hasImages ? styles.withImages : ""}`}
    >
      <ul className={styles.bars}>
        <DragDropWrapper onReorder={onReorder}>
          {data.map((datum, index) => (
            <SortableListItem
              key={datum.id}
              highestValue={highestValue}
              denominator={denominator}
              datum={datum}
              displayAsPercentage={displayAsPercentage}
              sortIndex={index}
              renderToggle={renderToggle}
              renderLabel={renderLabel}
              renderMenu={renderMenu}
              menuAlign={menuAlignFor(index)}
              orientation={orientation}
            />
          ))}
        </DragDropWrapper>
        {addOption && canAddOption && (
          <li className={styles.addSlot}>
            <AddOptionButton onClick={addOption} />
          </li>
        )}
      </ul>
    </div>
  );
};

export { BarChart };
