import { useAnimatedChartData } from "@/shared/components/Charts/useAnimatedChartData";
import { DragDropWrapper } from "@/shared/components/Wrappers/DragDropWrapper";
import React from "react";
import { CanAddOptionCard, SortableItemBankCard } from "../_shared/BankItems/ItemBankCard";
import { OptionToEditableMcqItem } from "../AllocationSlideContent/ItemFormatters";
import styles from "./McqSlideContent.module.css";
import { RenderMcqResultsDisplayOptions } from "./renderMcqResultsDisplay";

const DefaultResultsDisplay = (props: RenderMcqResultsDisplayOptions) => {
  const data = useAnimatedChartData(props.editor.question);
  if (props.editor.question == null || data == null) return <div>no question</div>;
  const { distribution, highestValue, denominator, optionCount, columns } = data;

  return (
    <div className={styles.optionsRow} style={{ "--cols": columns } as React.CSSProperties}>
      <DragDropWrapper onReorder={props.editor.actions.handleItemDragEnd}>
        {props.editor.question?.options.map((option, index) => (
          <SortableItemBankCard
            key={option.id}
            {...OptionToEditableMcqItem(
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
            )}
          />
        ))}
        {props.editor.state.canAddItem && (
          <CanAddOptionCard addOption={props.editor.actions.addItem} />
        )}
      </DragDropWrapper>
    </div>
  );
};

export { DefaultResultsDisplay };
