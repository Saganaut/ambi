import type { ChartDatum } from "@/shared/components/Charts/Chart.types";
import { DragDropWrapper } from "@/shared/components/Wrappers/DragDropWrapper";
import type { DragEndEvent } from "@dnd-kit/react";
import React, { ReactNode } from "react";
import {
  CanAddOptionCard,
  McqOptionEditable,
} from "../_shared/McqOptionEditable/McqOptionEditable";
import styles from "./McqSlideContent.module.css";

interface DefaultResultsDisplayProps {
  data: ChartDatum[];
  displayAsPercentage: boolean;
  onReorder: (event: DragEndEvent) => void;
  addOption: () => void;
  canAddOption: boolean;
  renderLabelWithMenu?: (datum: ChartDatum) => ReactNode;
  renderMenu?: (datum: ChartDatum) => ReactNode;
  /** Clears an option's image straight from its thumbnail. */
  onClearImage?: (optionId: string) => void;
}

const DefaultResultsDisplay = ({
  renderLabelWithMenu,
  data,
  displayAsPercentage,
  onReorder,
  addOption,
  canAddOption,
  onClearImage,
}: DefaultResultsDisplayProps) => {
  const denominator = data.reduce((sum, datum) => sum + datum.value, 0);
  const highestValue = Math.max(1, ...data.map((datum) => datum.value));
  const optionCount = data.length ?? 0;
  const columns = optionCount ? Math.max(Math.ceil(optionCount / 2), 2) : 2;
  return (
    <div className={styles.optionsRow} style={{ "--cols": columns } as React.CSSProperties}>
      <DragDropWrapper onReorder={onReorder}>
        {data.map((option, idx) => (
          <McqOptionEditable
            key={option.id}
            sortIndex={idx}
            datum={option}
            denominator={denominator}
            highestValue={highestValue}
            renderLabelWithMenu={renderLabelWithMenu}
            isCorrect={option.isCorrect ?? false}
            displayAsPercentage={displayAsPercentage}
            onClearImage={onClearImage}
          />
        ))}
        {canAddOption && <CanAddOptionCard addOption={addOption} />}
      </DragDropWrapper>
    </div>
  );
};

export { DefaultResultsDisplay };
