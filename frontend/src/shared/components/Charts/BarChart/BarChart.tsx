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
import styles from "./BarChart.module.css";

const BarChartInner = ({
  orientation,
  ...props
}: RenderMcqResultsDisplayOptions & { orientation: "horizontal" | "vertical" }) => {
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

  return (
    <SlideContent>
      <SlideContentSection>
        <SlideContentSection.Body>
          <div className={`${styles.chart} ${styles[orientation]}`}>
            <ul className={styles.bars}>
              <DragDropWrapper onReorder={props.editor.actions.handleItemDragEnd}>
                {editableItems.map((editableItem) => {
                  const value = editableItem.detail.mockDistributionValue;
                  const sizePct = (value / max) * 100;
                  const sharePct = denominator > 0 ? Math.round((value / denominator) * 100) : 0;

                  return (
                    <li key={editableItem.item.id} className={styles.row}>
                      <div className={styles.legendSlot}>
                        <SortableItemChartLegend
                          {...editableItem}
                          placement={orientation === "vertical" ? "below" : "side"}
                        />
                      </div>
                      <div className={styles.track}>
                        <div
                          className={styles.fill}
                          style={
                            {
                              "--size": `${sizePct.toFixed(1)}%`,
                              "--bar-color": editableItem.item.color,
                            } as React.CSSProperties
                          }
                        />
                      </div>
                      <span className={styles.value}>
                        {value}
                        {editableItem.state.displayAsPercentage && denominator > 0 && (
                          <span className={styles.share}> ({sharePct}%)</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </DragDropWrapper>
            </ul>
          </div>
        </SlideContentSection.Body>
      </SlideContentSection>
    </SlideContent>
  );
};

const BarChart = withChartErrorBoundary("bar", BarChartInner);

export { BarChart };
