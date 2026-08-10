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
import styles from "./LineChart.module.css";

const W = 100;
const H = 60;
const PAD = 6;

const LineChartInner = (props: RenderMcqResultsDisplayOptions) => {
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
  const span = Math.max(1, editableItems.length - 1);

  const points = editableItems.map((editableItem, index) => {
    const value = editableItem.detail.mockDistributionValue;
    const x = PAD + (index / span) * (W - PAD * 2);
    const y = H - PAD - (value / max) * (H - PAD * 2);
    return { editableItem, value, x, y };
  });

  const path = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");

  return (
    <SlideContent>
      <SlideContentSection>
        <SlideContentSection.Body>
          <div
            className={styles.chart}
            style={{ "--n": editableItems.length } as React.CSSProperties}
          >
            <div className={styles.valueRow}>
              {points.map((point) => (
                <div
                  key={point.editableItem.item.id}
                  className={styles.valueItem}
                  style={{ left: `${point.x.toFixed(2)}%` }}
                >
                  <span className={styles.labelValue}>
                    {point.value}
                    {point.editableItem.state.displayAsPercentage && denominator > 0 && (
                      <span className={styles.share}>
                        {" "}
                        ({Math.round((point.value / denominator) * 100)}%)
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.plot}>
              <svg
                className={styles.svg}
                viewBox={`0 0 ${W.toString()} ${H.toString()}`}
                preserveAspectRatio="none"
                role="img"
                aria-label="Line chart"
              >
                <line className={styles.axis} x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} />
                {points.length > 1 && <polyline className={styles.line} points={path} />}
              </svg>
              {points.map((point) => (
                <span
                  key={point.editableItem.item.id}
                  className={styles.marker}
                  style={{
                    left: `${point.x.toFixed(2)}%`,
                    top: `${((point.y / H) * 100).toFixed(2)}%`,
                    background: point.editableItem.item.color,
                  }}
                  aria-hidden="true"
                />
              ))}
            </div>
            <div className={styles.controlsRow}>
              <DragDropWrapper onReorder={props.editor.actions.handleItemDragEnd}>
                {points.map((point) => (
                  <div
                    key={point.editableItem.item.id}
                    className={styles.controlsItem}
                    style={{ left: `${point.x.toFixed(2)}%` }}
                  >
                    <SortableItemChartLegend {...point.editableItem} placement="below" />
                  </div>
                ))}
              </DragDropWrapper>
            </div>
          </div>
        </SlideContentSection.Body>
      </SlideContentSection>
    </SlideContent>
  );
};

const LineChart = withChartErrorBoundary("line", LineChartInner);

export { LineChart };
