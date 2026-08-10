import { SortableItemChartLegend } from "@/features/deck/components/DeckEditor/SlideContent/_shared";
import { OptionToEditableMcqItem } from "@/features/deck/components/DeckEditor/SlideContent/AllocationSlideContent/ItemFormatters";
import { RenderMcqResultsDisplayOptions } from "@/features/deck/components/DeckEditor/SlideContent/McqSlideContent/renderMcqResultsDisplay";
import {
  SlideContent,
  SlideContentSection,
} from "@/features/deck/components/DeckEditor/SlideContent/SlideContentSection";
import { DragDropWrapper } from "../../Wrappers/DragDropWrapper";
import { useAnimatedChartData } from "../useAnimatedChartData";
import { withChartErrorBoundary } from "../withChartErrorBoundary";
import styles from "./ParetoChart.module.css";

const W = 100;
const H = 60;
const PAD = 6;

const ParetoChartInner = (props: RenderMcqResultsDisplayOptions) => {
  const data = useAnimatedChartData(props.editor.question);

  if (props.editor.question == null || data == null) return <div>no question</div>;
  const { distribution, highestValue, denominator, optionCount } = data;

  const editableItems = props.editor.question.options.map((option, index) => {
    return OptionToEditableMcqItem(
      option,
      index,
      props.editor.actions,
      props.editor.state,
      props.openPicker,
      props.setOpenMenuId,
      props.openMenuId,
      distribution[option.id],
      highestValue,
      denominator,
      optionCount,
    );
  });

  const max = Math.max(1, highestValue);
  const sorted = editableItems
    .slice()
    .sort(
      (first, second) => second.detail.mockDistributionValue - first.detail.mockDistributionValue,
    );

  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;
  const slot = plotW / Math.max(1, sorted.length);
  const barW = slot * 0.6;

  let running = 0;
  const bars = sorted.map((editableItem, sortedIndex) => {
    const value = editableItem.detail.mockDistributionValue;
    running += value;
    const cumPct = denominator > 0 ? running / denominator : 0;
    const centerX = PAD + slot * sortedIndex + slot / 2;
    return {
      editableItem,
      value,
      cumPct,
      barX: centerX - barW / 2,
      barH: (value / max) * plotH,
      cumX: centerX,
      cumY: H - PAD - cumPct * plotH,
    };
  });

  const linePath = bars.map((bar) => `${bar.cumX.toFixed(2)},${bar.cumY.toFixed(2)}`).join(" ");

  return (
    <SlideContent>
      <SlideContentSection>
        <SlideContentSection.Body>
          <div className={styles.chart}>
            <div className={styles.plot}>
              <svg
                className={styles.svg}
                viewBox={`0 0 ${W.toString()} ${H.toString()}`}
                preserveAspectRatio="none"
                role="img"
                aria-label="Pareto chart"
              >
                <line className={styles.axis} x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} />
                {bars.map((bar) => (
                  <rect
                    key={bar.editableItem.item.id}
                    className={styles.bar}
                    x={bar.barX}
                    y={H - PAD - bar.barH}
                    width={barW}
                    height={bar.barH}
                    style={{ fill: bar.editableItem.item.color }}
                  />
                ))}
                {bars.length > 1 && <polyline className={styles.cumLine} points={linePath} />}
              </svg>
              {bars.map((bar) => (
                <span
                  key={bar.editableItem.item.id}
                  className={styles.cumMarker}
                  style={{
                    left: `${bar.cumX.toFixed(2)}%`,
                    top: `${((bar.cumY / H) * 100).toFixed(2)}%`,
                  }}
                  aria-hidden="true"
                />
              ))}
            </div>
            <ul className={styles.labels}>
              <DragDropWrapper onReorder={props.editor.actions.handleItemDragEnd}>
                {bars.map((bar) => (
                  <li key={bar.editableItem.item.id} className={styles.label}>
                    <span className={styles.labelStats}>
                      <span className={styles.labelValue}>{bar.value}</span>
                      <span className={styles.labelShare}> · {Math.round(bar.cumPct * 100)}%</span>
                    </span>
                    <SortableItemChartLegend {...bar.editableItem} placement="below" />
                  </li>
                ))}
              </DragDropWrapper>
            </ul>
          </div>
        </SlideContentSection.Body>
      </SlideContentSection>
    </SlideContent>
  );
};

const ParetoChart = withChartErrorBoundary("pareto", ParetoChartInner);

export { ParetoChart };
