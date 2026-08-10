import { AddItemCard } from "@/features/deck/components/DeckEditor/SlideContent/_shared";
import { Orientation } from "@/features/deck/components/DeckEditor/SlideContent/_shared/Item.types";
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
import { BarChartItem } from "./BarChartItem";

const BarChartInner = ({
  orientation,
  ...props
}: RenderMcqResultsDisplayOptions & { orientation: Orientation }) => {
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
                  return (
                    <BarChartItem
                      key={editableItem.item.id}
                      editableItem={editableItem}
                      max={max}
                      denominator={denominator}
                      orientation={orientation}
                    />
                  );
                })}
              </DragDropWrapper>{" "}
              {props.editor.state.canAddItem && (
                <AddItemCard
                  label={"Add option"}
                  disabled={!props.editor.state.canAddItem}
                  onAdd={props.editor.actions.addItem}
                />
              )}
            </ul>
          </div>
        </SlideContentSection.Body>
      </SlideContentSection>
    </SlideContent>
  );
};

const BarChart = withChartErrorBoundary("bar", BarChartInner);

export { BarChart };
