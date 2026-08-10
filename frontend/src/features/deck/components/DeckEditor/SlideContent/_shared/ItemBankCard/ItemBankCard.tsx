import { useSortable } from "@dnd-kit/react/sortable";

import { emptyImage, resolveImageUrl } from "@/shared/utils/image";
import { numberToLetter } from "@/shared/utils/utils";
import { AppImg } from "@components/Images/AppImg";
import {
  CheckIcon,
  PlusCircleIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { ProgressBar } from "@ui/ProgressBar/ProgressBar";
import { IndexPill } from "../IndexPill/IndexPill";
import { EditableItem, SortableEditableItem } from "../Item.types";
import { ItemField } from "../ItemField/ItemField";
import styles from "./ItemBankCard.module.css";

/**
 * The editable card carries one handler the read-only chart segments don't:
 * clearing the option's image from the thumbnail itself. It stays optional (and
 * off `ChartSegmentRenderProps`) so the display-only chart renderers keep their
 * shared shape.
 */

const ItemBankCard = (props: SortableEditableItem<"MCQ">) => {
  //TODO: find ways to add this in here.

  const { item, actions, state, sortable, sourceIndex, detail } = props;
  const _sizePct = (detail.mockDistributionValue / detail.mockDistributionHighestValue) * 100;
  const sharePct =
    detail.mockDistributionDenominator > 0
      ? Math.round((detail.mockDistributionValue / detail.mockDistributionDenominator) * 100)
      : 0;
  const displayAsPercentage = state.displayAsPercentage;

  const thumbnailSrc = resolveImageUrl(item.image, "SM", item.id ?? "", 200, 200, false);
  const isCorrect = state.isScorable;
  const displayIndex = sourceIndex + 1;
  return (
    <div
      ref={sortable.rootRef}
      className={`${styles.card} ${isCorrect ? styles.cardCorrect : ""} ${sortable.isDragging ? styles.isDragging : ""}`}
    >
      <div className={styles.topRow}>
        <div>
          <IndexPill value={numberToLetter(displayIndex)} variant="square" color={item.color} />
        </div>
        <div
          className={styles.interactiveZone}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
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
        <div
          className={styles.imgThumbnail}
          style={thumbnailSrc ? {} : ({ backgroundColor: item.color } as React.CSSProperties)}
        >
          {thumbnailSrc && (
            <AppImg
              className={styles.thumbnail}
              src={thumbnailSrc}
              alt={`Img Option ${sourceIndex}`}
              fallbackSeed={item.id}
            />
          )}{" "}
          <IconBtn
            fill="ghost"
            size="xs"
            className={styles.imageClear}
            icon={<XMarkIcon />}
            aria-label={`Remove option ${numberToLetter(sourceIndex).toUpperCase()} image`}
            onClick={(e) => {
              e.stopPropagation();
              actions.setImageForItem(emptyImage());
            }}
          />
        </div>
      </div>
      <div className={styles.bottomRow}>
        <ProgressBar value={sharePct} color={item.color} />
        {displayAsPercentage && <span className={styles.percentage}>{sharePct}%</span>}
        <>
          {state.isScorable ? (
            <IconBtn
              fill="ghost"
              size="xs"
              icon={<CheckIcon />}
              aria-label={"Toggle scorability"}
              onClick={(e) => {
                e.stopPropagation();
                actions.toggleScorabilityForItem();
              }}
            />
          ) : (
            <IconBtn
              fill="ghost"
              size="xs"
              icon={<QuestionMarkCircleIcon />}
              aria-label={"Toggle scorability"}
              onClick={(e) => {
                e.stopPropagation();
                actions.toggleScorabilityForItem();
              }}
            />
          )}
        </>
      </div>
    </div>
  );
};
//TODO: move this to another file
//Keep it in this folder if only used by this component.
const CanAddOptionCard = ({ addOption }: { addOption: () => void }) => {
  return (
    <button
      onClick={() => {
        addOption();
      }}
      className={`${styles.card}`}
    >
      <span>
        <PlusCircleIcon />
      </span>{" "}
      Add option
    </button>
  );
};

const SortableItemBankCard = (item: EditableItem<"MCQ">) => {
  const { ref, handleRef, isDragging } = useSortable({
    id: item.item.id,
    index: item.sourceIndex,
  });

  const sortable = { rootRef: ref, handleRef: handleRef, isDragging: isDragging };
  return <ItemBankCard {...{ ...item, sortable }} />;
};

export { CanAddOptionCard };

export { ItemBankCard };

export { SortableItemBankCard };
