import { ItemField } from "@/features/deck/components/DeckEditor/SlideContent/_shared";
import { SortableEditableItem } from "@/features/deck/components/DeckEditor/SlideContent/_shared/Item.types";
import { resolveImageUrl } from "@/shared/utils/image";
import { AppImg } from "../../Images/AppImg";
import styles from "./PieChart.module.css";

const LegendItem = (props: SortableEditableItem<"MCQ">) => {
  const { item, actions, state, sortable, sourceIndex, detail } = props;
  const isCorrect = state.isScorable;
  const thumbnailSrc = resolveImageUrl(item.image, "SM", item.id ?? "", 200, 200, false);
  const displayIndex = sourceIndex + 1;
  const pct = detail.mockDistributionValue / detail.mockDistributionHighestValue;
  return (
    <li
      ref={sortable.rootRef}
      className={`${styles.legendItem} ${isCorrect ? styles.highlight : ""}`}
    >
      <span className={styles.swatch} style={{ background: item.color }} aria-hidden="true" />
      <AppImg
        className={styles.thumbnail}
        src={thumbnailSrc}
        alt={`Img Option ${sourceIndex}`}
        fallbackSeed={item.id}
      />
      <div className={styles.optionControls}>
        <ItemField
          itemId={item.id}
          label={props.item.label}
          image={item.image}
          displayIndex={displayIndex}
          placeholder={`${displayIndex.toString()}`}
          maxLength={100}
          color={item.color}
          open={state.menuIsOpen}
          onOpenChange={actions.setMenuIsOpenForItem}
          canRemove={state.canRemove}
          onScheduleLabel={actions.scheduleItemLabel}
          onFlush={actions.flush}
          onSetColor={actions.setColorForItem}
          onSetImage={actions.setImageForItem}
          onRemove={actions.removeItem}
          openPicker={actions.openImagePicker}
        />
      </div>
      <span className={styles.legendValue}>
        {detail.mockDistributionValue}
        {state.displayAsPercentage && ` (${Math.round(pct).toString()}%)`}
      </span>
    </li>
  );
};

export { LegendItem };
