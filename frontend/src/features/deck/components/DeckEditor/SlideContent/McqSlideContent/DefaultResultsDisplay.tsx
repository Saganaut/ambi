import type { ChartDatum } from "@/shared/components/Charts/types";
import type { DragEndEvent } from "@dnd-kit/react";
import { DragDropProvider } from "@dnd-kit/react";
import React, { ReactNode } from "react";
import { McqOptionEditable } from "../_shared/McqOptionEditable/McqOptionEditable";
import styles from "./McqSlideContent.module.css";

interface DefaultResultsDisplayProps {
  data: ChartDatum[];
  displayAsPercentage: boolean;
  onReorder: (event: DragEndEvent) => void;
  addOption: () => void;
  canAddOption: boolean;
  renderLabel?: (datum: ChartDatum) => ReactNode;
  renderToggle?: (datum: ChartDatum) => ReactNode;
  renderMenu?: (datum: ChartDatum) => ReactNode;
}

const DefaultResultsDisplay = ({
  renderLabel,
  renderToggle,
  renderMenu,
  data,
  displayAsPercentage,
  onReorder,
  addOption,
  canAddOption,
}: DefaultResultsDisplayProps) => {
  const denominator = data.reduce((sum, datum) => sum + datum.value, 0);
  const highestValue = Math.max(1, ...data.map((datum) => datum.value));
  const optionCount = data.length ?? 0;
  const columns = optionCount ? Math.max(Math.ceil(optionCount / 2), 2) : 2;
  return (
    <div className={styles.optionsRow} style={{ "--cols": columns } as React.CSSProperties}>
      <DragDropProvider
        onDragEnd={(event) => {
          onReorder(event);
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
            highestValue={highestValue}
            renderToggle={renderToggle}
            renderLabel={renderLabel}
            isCorrect={option.isCorrect ?? false}
            renderMenu={renderMenu}
            displayAsPercentage={displayAsPercentage}
          />
        ))}
      </DragDropProvider>
    </div>
  );
};

export { DefaultResultsDisplay };
