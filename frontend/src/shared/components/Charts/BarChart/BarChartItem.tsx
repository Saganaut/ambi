import { ItemChartLegend } from "@/features/deck/components/DeckEditor/SlideContent/_shared";
import {
  EditableItem,
  Orientation,
} from "@/features/deck/components/DeckEditor/SlideContent/_shared/Item.types";
import { useSortable } from "@dnd-kit/react/sortable";
import styles from "./BarChart.module.css";

const BarChartItem = ({
  editableItem,
  max,
  denominator,
  orientation,
}: {
  editableItem: EditableItem<"MCQ">;
  max: number;
  denominator: number;
  orientation: Orientation;
}) => {
  const value = editableItem.detail.mockDistributionValue;
  const sizePct = (value / max) * 100;
  const sharePct = denominator > 0 ? Math.round((value / denominator) * 100) : 0;
  const { ref, handleRef, isDragging } = useSortable({
    id: editableItem.item.id,
    index: editableItem.sourceIndex,
  });

  const sortable = { rootRef: ref, handleRef: handleRef, isDragging: isDragging };
  return (
    <li ref={sortable.rootRef} key={editableItem.item.id} className={styles.row}>
      <div className={styles.legendSlot}>
        <ItemChartLegend
          sortable={sortable}
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
};

export { BarChartItem };
