import { AppImg } from "@/shared/components/Images/AppImg";
import { emptyImage, resolveImageUrl } from "@/shared/utils/image";
import { numberToLetter } from "@/shared/utils/utils";
import { useSortable } from "@dnd-kit/react/sortable";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Btn } from "@saganaut/ambi-ui";
import { IndexPill } from "../IndexPill/IndexPill";
import { EditableItem, SortableEditableItem } from "../Item.types";
import { ItemField } from "../ItemField/ItemField";
import { ScorableToggle } from "../ScorableToggle";
import styles from "./ItemChartLegend.module.css";

type ItemChartLegendPlacement = "below" | "side";

type ItemChartLegendProps = SortableEditableItem & {
  placement: ItemChartLegendPlacement;
};

type SortableItemChartLegendProps = EditableItem & {
  placement: ItemChartLegendPlacement;
};

const ItemChartLegend = ({ placement, ...props }: ItemChartLegendProps) => {
  const { item, sourceIndex, actions, state, sortable } = props;
  const displayIndex = numberToLetter(sourceIndex + 1);
  const thumbnailSrc = resolveImageUrl(item.image, "SM", item.id, 200, 200, false);

  return (
    <div
      className={[
        styles.legend,
        styles[placement],
        sortable.isDragging ? styles.isDragging : "",
        state.isSelected ? styles.selected : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <IndexPill value={displayIndex} color={item.color} />

      <div className={`${styles.collapsable} ${thumbnailSrc !== null ? styles.expanded : ""}`}>
        <span className={styles.thumbnailWrap}>
          {thumbnailSrc && (
            <AppImg
              className={styles.thumbnail}
              src={thumbnailSrc}
              alt={`Img Option ${displayIndex}`}
              fallbackSeed={item.id}
            />
          )}
          <Btn
            fill="ghost"
            size="xs"
            className={styles.thumbnailClear}
            icon={<XMarkIcon />}
            aria-label={`Remove ${displayIndex} image`}
            onClick={(event) => {
              event.stopPropagation();
              actions.setImageForItem(emptyImage());
            }}
          />
        </span>
      </div>

      <div className={styles.field}>
        <ItemField
          itemId={item.id}
          label={item.label}
          image={item.image}
          displayIndex={sourceIndex + 1}
          placeholder={`${(sourceIndex + 1).toString()}`}
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

      <ScorableToggle
        isScorable={state.isScorable}
        toggle={(e) => {
          e.stopPropagation();
          actions.toggleScorabilityForItem();
        }}
      />

      {/* <span
        ref={sortable.handleRef}
        className={styles.grip}
        role="button"
        aria-label={`Reorder item ${(sourceIndex + 1).toString()}`}
      >
        <DragIcon className={styles.gripIcon} aria-hidden="true" />
      </span> */}
    </div>
  );
};

const SortableItemChartLegend = (props: SortableItemChartLegendProps) => {
  const { ref, handleRef, isDragging } = useSortable({
    id: props.item.id,
    index: props.sourceIndex,
  });

  const sortable = { rootRef: ref, handleRef: handleRef, isDragging: isDragging };
  return <ItemChartLegend {...props} sortable={sortable} />;
};

export { ItemChartLegend, SortableItemChartLegend };
export type { ItemChartLegendPlacement, ItemChartLegendProps, SortableItemChartLegendProps };
