import { GeneralChartProps } from "@/shared/components/Charts/types";
import { DragDropProvider } from "@dnd-kit/react";
import React from "react";
import { McqOptionEditable } from "../_shared/McqOptionEditable/McqOptionEditable";
import styles from "./McqSlideContent.module.css";

type DefaultResultsProps = GeneralChartProps;

const DefaultResultsDisplay = ({
  renderLabel,
  renderToggle,
  renderMenu,
  chartMode,
  editor,
  data,
  displayAsPercentage,
}: DefaultResultsProps) => {
  if (chartMode !== "editable") throw Error("Component not editable when it is expected to be so");

  const { question, canAddOption, addOption, isCorrect, handleOptionDragEnd } = editor;

  if (question == null) return <p> no question</p>;

  const denominator = data.reduce((sum, datum) => sum + datum.value, 0);
  const max = Math.max(1, ...data.map((datum) => datum.value));
  const optionCount = data.length ?? 0;
  const columns = optionCount ? Math.max(Math.ceil(optionCount / 2), 2) : 2;
  return (
    <div className={styles.optionsRow} style={{ "--cols": columns } as React.CSSProperties}>
      <DragDropProvider
        onDragEnd={(event) => {
          handleOptionDragEnd(event);
        }}
      >
        {data.map((option, idx) => (
          <McqOptionEditable
            key={option.id}
            sortIndex={idx}
            addOption={addOption}
            canAddOption={canAddOption}
            datum={option}
            denominator={denominator}
            max={max}
            renderToggle={renderToggle}
            renderLabel={renderLabel}
            isCorrect={isCorrect(option.id)}
            renderMenu={renderMenu}
            displayAsPercentage={displayAsPercentage}
          />
        ))}
      </DragDropProvider>
    </div>
  );
};

export { DefaultResultsDisplay };
