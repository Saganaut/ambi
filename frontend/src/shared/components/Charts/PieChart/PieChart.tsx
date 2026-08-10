import {
  AddItemCard,
  SortableItemBankRow,
} from "@/features/deck/components/DeckEditor/SlideContent/_shared";
import { OptionToEditableMcqItem } from "@/features/deck/components/DeckEditor/SlideContent/AllocationSlideContent/ItemFormatters";
import { RenderMcqResultsDisplayOptions } from "@/features/deck/components/DeckEditor/SlideContent/McqSlideContent/renderMcqResultsDisplay";
import {
  SlideContent,
  SlideContentSection,
} from "@/features/deck/components/DeckEditor/SlideContent/SlideContentSection";
import { useEffect, useState } from "react";
import { DragDropWrapper } from "../../Wrappers/DragDropWrapper";
import { useAnimatedChartData } from "../useAnimatedChartData";
import { withChartErrorBoundary } from "../withChartErrorBoundary";
import styles from "./PieChart.module.css";

// Pie: stroke covers the whole radius (r=25, width=50). Donut: a band.
const RADII = { pie: 25, donut: 38 } as const;
const STROKE = { pie: 50, donut: 16 } as const;

const PieChartInner = ({
  variant,
  ...props
}: RenderMcqResultsDisplayOptions & { variant: "pie" | "donut" }) => {
  const animateOnMount = true;
  useEffect(() => {
    if (!animateOnMount) return;
    const id = requestAnimationFrame(() => {
      setRevealed(true);
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, [animateOnMount]);
  const [revealed, setRevealed] = useState(!animateOnMount);

  const data = useAnimatedChartData(props.editor.question);

  if (props.editor.question == null || data == null) return <div>no question</div>;
  const { distribution, highestValue, denominator, optionCount } = data;

  const EditableItems = props.editor.question.options.map((option, index) => {
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
  let start = 0;

  const slices = EditableItems.map((item) => {
    const pct = (item.detail.mockDistributionValue / denominator) * 100;
    const slice = { item, pct, start };
    start += pct;
    return slice;
  });

  const lastSlice = slices[slices.length - 1];

  return (
    <SlideContent>
      <SlideContentSection>
        <SlideContentSection.Body>
          <div className={styles.plot}>
            <svg
              className={styles.svg}
              viewBox="0 0 100 100"
              role="img"
              aria-label={variant === "donut" ? "Donut chart" : "Pie chart"}
            >
              <circle className={styles.backdrop} cx="50" cy="50" r="49" />
              <g transform="rotate(-90 50 50)">
                <circle
                  className={styles.slice}
                  cx="50"
                  cy="50"
                  r={RADII[variant]}
                  pathLength={100}
                  strokeWidth={STROKE[variant]}
                  stroke={lastSlice.item.item.color}
                  strokeDasharray={`${(revealed ? lastSlice.pct + 1 : 0).toFixed(3)} 100`}
                  strokeDashoffset={(-lastSlice.start).toFixed(3)}
                  style={{
                    transitionDelay: !revealed
                      ? `${(lastSlice.item.sourceIndex * 90).toString()}ms`
                      : undefined,
                  }}
                />
                {slices.map((slice) => (
                  <circle
                    key={slice.item.sourceIndex}
                    className={styles.slice}
                    cx="50"
                    cy="50"
                    r={RADII[variant]}
                    pathLength={100}
                    strokeWidth={STROKE[variant]}
                    stroke={slice.item.item.color}
                    strokeDasharray={`${(revealed ? slice.pct : 0).toFixed(3)} 100`}
                    strokeDashoffset={(-slice.start).toFixed(3)}
                    style={{
                      transitionDelay: !revealed
                        ? `${(slice.item.sourceIndex * 90).toString()}ms`
                        : undefined,
                    }}
                  />
                ))}
              </g>
            </svg>
          </div>{" "}
        </SlideContentSection.Body>
      </SlideContentSection>{" "}
      <SlideContentSection>
        <SlideContentSection.Body>
          <ul className={styles.legend}>
            <DragDropWrapper onReorder={props.editor.actions.handleItemDragEnd}>
              {EditableItems.map((option) => (
                <SortableItemBankRow key={option.item.id} {...option} />
              ))}
            </DragDropWrapper>
            {props.editor.state.canAddItem && (
              <AddItemCard
                label={"Add option"}
                disabled={!props.editor.state.canAddItem}
                onAdd={props.editor.actions.addItem}
              />
            )}
          </ul>{" "}
        </SlideContentSection.Body>
      </SlideContentSection>
    </SlideContent>
  );
};

const PieChart = withChartErrorBoundary("pie", PieChartInner);

export { PieChart };
