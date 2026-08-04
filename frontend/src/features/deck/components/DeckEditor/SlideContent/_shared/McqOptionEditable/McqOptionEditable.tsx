import { useSortable } from "@dnd-kit/react/sortable";

import { ChartSegmentRenderProps } from "@/shared/components/Charts/Chart.types";
import { CorrectBadge } from "@/shared/components/Charts/CorrectBadge/CorrectBadge";
import { AppImg } from "@components/Images/AppImg";
import { numberToLetter } from "@/shared/utils/utils";
import { PlusCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { ProgressBar } from "@ui/ProgressBar/ProgressBar";
import { IndexPill } from "../IndexPill/IndexPill";
import styles from "./McqOptionEditable.module.css";
import { resolveOptionColor } from "./optionColor";

/**
 * The editable card carries one handler the read-only chart segments don't:
 * clearing the option's image from the thumbnail itself. It stays optional (and
 * off `ChartSegmentRenderProps`) so the display-only chart renderers keep their
 * shared shape.
 */
interface McqOptionEditableProps extends ChartSegmentRenderProps {
  /** Clears the option's image; omit to render the thumbnail read-only. */
  onClearImage?: (datumId: string) => void;
}

const McqOptionEditable = ({
  sortIndex,
  displayAsPercentage,
  renderLabelWithMenu,
  datum,
  highestValue,
  denominator,
  isCorrect = false,
  onClearImage,
}: McqOptionEditableProps) => {
  const { ref: sortableRef, isDragging } = useSortable({
    id: datum.id,
    index: sortIndex,
  });

  //TODO: find ways to add this in here.
  const max = highestValue ?? 10;
  const _sizePct = (datum.value / max) * 100;
  const _sharePct = denominator > 0 ? Math.round((datum.value / denominator) * 100) : 0;
  const _displayAsPercentage = displayAsPercentage;

  if (datum == null) return <div> no option found</div>;
  const thumbnailSrc = datum.imageUrl ?? null;
  const color = resolveOptionColor(datum.color, sortIndex);
  const displayIndex = sortIndex >= 0 ? sortIndex + 1 : 0;

  return (
    <div
      ref={sortableRef}
      className={`${styles.card} ${isCorrect ? styles.cardCorrect : ""} ${isDragging ? styles.isDragging : ""}`}
    >
      <div className={styles.topRow}>
        <div>
          <IndexPill value={numberToLetter(displayIndex)} variant="square" color={color} />
        </div>
        <div
          className={styles.interactiveZone}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {renderLabelWithMenu ? (
            renderLabelWithMenu(datum)
          ) : (
            <span className={styles.label}>{datum.text ?? ""}</span>
          )}
        </div>
        <div className={styles.imgThumbnail} style={thumbnailSrc ? {} : { backgroundColor: color }}>
          {thumbnailSrc && (
            <>
              <AppImg src={thumbnailSrc} alt="" fallbackSeed={datum.id} />
              {onClearImage && (
                <IconBtn
                  fill="ghost"
                  size="xs"
                  className={styles.imageClear}
                  icon={<XMarkIcon />}
                  // Uppercased to match the pill, which capitalizes in CSS.
                  aria-label={`Remove option ${numberToLetter(displayIndex).toUpperCase()} image`}
                  onClick={(e) => {
                    // The card is a click/sort target — clearing must not also
                    // select or drag it.
                    e.stopPropagation();
                    onClearImage(datum.id);
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
      <div className={styles.bottomRow}>
        <ProgressBar value={_sharePct} color={color} />
        {displayAsPercentage && <span className={styles.percentage}>{_sharePct}%</span>}
        <CorrectBadge isCorrect={isCorrect} />
      </div>
    </div>
  );
};

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

export { CanAddOptionCard };

export { McqOptionEditable };
