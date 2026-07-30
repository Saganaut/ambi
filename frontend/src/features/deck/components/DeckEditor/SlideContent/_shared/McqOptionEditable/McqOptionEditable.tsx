/**
 * Full author surface for a single McqOption 

 */
import { useSortable } from "@dnd-kit/react/sortable";

import { AddOptionPopover } from "@/shared/components/Charts/AddOptionButton/AddOptionPopover";
import { ChartSegmentRenderProps } from "@/shared/components/Charts/Chart.types";
import { CorrectBadge } from "@/shared/components/Charts/CorrectBadge/CorrectBadge";
import { Container } from "@components/Containers/Container";
import { ProgressBar } from "@ui/ProgressBar/ProgressBar";
import { IndexPill } from "../IndexPill/IndexPill";
import styles from "./McqOptionEditable.module.css";
import { resolveOptionColor } from "./optionColor";

type DefaultNoChartSegmentProps = ChartSegmentRenderProps;
//TODO: is render menu still necessary? I think it has been replaced by render label with menu?
const McqOptionEditable = ({
  sortIndex,
  displayAsPercentage,
  renderLabelWithMenu,
  renderMenu,
  datum,
  highestValue,
  denominator,
  isCorrect = false,
  addOption,
  canAddOption,
}: DefaultNoChartSegmentProps) => {
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

  const card = (
    <div
      className={`${styles.card} ${isCorrect ? styles.cardCorrect : ""} ${isDragging ? styles.isDragging : ""}`}
    >
      <div className={styles.topRow}>
        <div>
          <IndexPill value={displayIndex} variant="square" color={color} />
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
          {thumbnailSrc && <img src={thumbnailSrc} alt="" />}
        </div>
      </div>
      <div className={styles.bottomRow}>
        <ProgressBar value={_sharePct} color={color} />
        {displayAsPercentage && <span className={styles.percentage}>{_sharePct}%</span>}
        <CorrectBadge isCorrect={isCorrect} />

        {/* <div className={styles.footer}>{renderMenu?.(datum)}</div> */}
      </div>
    </div>
  );

  return (
    <Container ref={sortableRef} name="McqOptionCard">
      {canAddOption && addOption ? <AddOptionPopover anchor={card} onAdd={addOption} /> : card}
    </Container>
  );
};

export { McqOptionEditable };
