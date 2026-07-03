/**
 * Full author surface for a single McqOption 

 */
import { useSortable } from "@dnd-kit/react/sortable";
import { useEffect, useRef, useState } from "react";

import { ChartSegmentRenderProps } from "@/shared/components/Charts/Chart.types";
import { Container } from "@components/Containers/Container";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { ProgressBar } from "@ui/ProgressBar/ProgressBar";
import { IndexPill } from "../IndexPill";
import styles from "./McqOptionEditable.module.css";
import { resolveOptionColor } from "./optionColor";

type DefaultNoChartSegmentProps = ChartSegmentRenderProps;

const McqOptionEditable = ({
  sortIndex,
  displayAsPercentage,
  renderLabel,
  renderToggle,
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

  const [popoverOpen, setPopoverOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const setCardRef = (node: HTMLDivElement | null) => {
    cardRef.current = node;
    if (typeof sortableRef === "function") sortableRef(node);
  };

  useEffect(() => {
    if (!popoverOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!cardRef.current?.contains(e.target as Node)) setPopoverOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopoverOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [popoverOpen]);

  if (datum == null) return <div> no option found</div>;
  const thumbnailSrc = datum.imageUrl ?? null;
  const color = resolveOptionColor(datum.color, sortIndex);
  const displayIndex = sortIndex >= 0 ? sortIndex + 1 : 0;

  return (
    <Container ref={setCardRef} name="McqOptionCard">
      <div
        className={`${styles.card} ${isCorrect ? styles.cardCorrect : ""} ${isDragging ? styles.isDragging : ""}`}
        onClick={() => {
          setPopoverOpen((o) => !o);
        }}
      >
        <div className={styles.topRow}>
          <div className={styles.textColumn}>
            <IndexPill value={displayIndex} variant='bare' />
            <div
              className={styles.interactiveZone}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {renderLabel ? (
                renderLabel(datum)
              ) : (
                <span className={styles.label}>{datum.text ?? ""}</span>
              )}
            </div>
          </div>
          <div
            className={styles.imgThumbnail}
            style={thumbnailSrc ? {} : { backgroundColor: color }}
          >
            {thumbnailSrc && <img src={thumbnailSrc} alt="" />}
          </div>
        </div>

        <ProgressBar value={100} color={color} />
        <div className={styles.footer}>
          {renderToggle?.(datum)}
          {renderMenu?.(datum)}
        </div>
        {canAddOption && (
          <div className={styles.canAddBtn}>
            <IconBtn
              size="sm"
              shape="round"
              variant="info"
              onClick={addOption}
              disabled={!canAddOption}
              icon={
                <svg
                  width="100pt"
                  height="100pt"
                  version="1.1"
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="m50 26.699c-1.3906 0-2.5195 1.1289-2.5195 2.5195v18.262h-18.262c-1.3906 0-2.5195 1.1289-2.5195 2.5195s1.1289 2.5195 2.5195 2.5195h18.262v18.262c0 1.3906 1.1289 2.5195 2.5195 2.5195s2.5195-1.1289 2.5195-2.5195v-18.262h18.262c1.3906 0 2.5195-1.1289 2.5195-2.5195s-1.1289-2.5195-2.5195-2.5195h-18.262v-18.262c0-1.3906-1.1289-2.5195-2.5195-2.5195z"
                    fill="green"
                  />
                </svg>
              }
            />
          </div>
        )}
      </div>
    </Container>
  );
};

export { McqOptionEditable };
