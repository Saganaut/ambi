import { useSortable } from "@dnd-kit/react/sortable";
import { useRef } from "react";
import { DragDropWrapper } from "../../Wrappers/DragDropWrapper";
import { AddOptionPopover } from "../AddOptionButton/AddOptionPopover";
import type { ChartProps, ChartSegmentRenderProps, MenuAlign } from "../Chart.types";
import { OptionImage } from "../OptionImage/OptionImage";
import { resolveDatumColor } from "../optionPalette";
import { withChartErrorBoundary } from "../withChartErrorBoundary";
import styles from "./BarChart.module.css";

export type BarChartProps = ChartProps;

export type BarChartSegmentRenderProps = ChartSegmentRenderProps & {
  /** Popover side for this row's menu — "end" for right-half vertical columns. */
  menuAlign?: MenuAlign;
  /** Bar growth direction — picks the in-bar image anchor (left vs. base). */
  orientation?: "horizontal" | "vertical";
  /** Whether this final option owns the chart's add-option affordance. */
  isAddAnchor?: boolean;
};

const SortableListItem = ({
  sortIndex,
  renderLabelWithMenu,
  // renderMenu,
  displayAsPercentage,
  datum,
  highestValue,
  denominator,
  addOption,
  canAddOption,
  isAddAnchor = false,
  // menuAlign,
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
  const row = (
    <li ref={setCardRef} className={`${styles.row} ${datum.highlight ? styles.highlight : ""}`}>
      <div className={styles.optionControls}>
        {renderLabelWithMenu ? (
          renderLabelWithMenu(datum)
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
              "--bar-color": resolveDatumColor(datum.color, sortIndex),
            } as React.CSSProperties
          }
        />
        <OptionImage
          src={datum.imageUrl}
          alt={datum.imageAlt}
          variant={orientation === "vertical" ? "barVertical" : "barHorizontal"}
          fallbackSeed={datum.id}
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

  return isAddAnchor && canAddOption && addOption ? (
    <AddOptionPopover
      anchor={row}
      onAdd={addOption}
      placement={orientation === "vertical" ? "top" : "right"}
      focusableAnchor
    />
  ) : (
    row
  );
};

const BarChartInner = ({
  renderLabelWithMenu,
  // renderMenu,
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
    <div className={`${styles.chart} ${styles[orientation]} ${hasImages ? styles.withImages : ""}`}>
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
              renderLabelWithMenu={renderLabelWithMenu}
              menuAlign={menuAlignFor(index)}
              orientation={orientation}
              addOption={addOption}
              canAddOption={canAddOption}
              isAddAnchor={index === data.length - 1}
            />
          ))}
        </DragDropWrapper>
      </ul>
    </div>
  );
};

const BarChart = withChartErrorBoundary("bar", BarChartInner);

export { BarChart };
