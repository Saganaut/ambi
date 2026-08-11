import {
  AddItemCard,
  ItemChartLegend,
} from "@/features/deck/components/DeckEditor/SlideContent/_shared";
import { EditableItem } from "@/features/deck/components/DeckEditor/SlideContent/_shared/Item.types";
import { OptionToEditableMcqItem } from "@/features/deck/components/DeckEditor/SlideContent/AllocationSlideContent/ItemFormatters";
import { RenderMcqResultsDisplayOptions } from "@/features/deck/components/DeckEditor/SlideContent/McqSlideContent/renderMcqResultsDisplay";
import {
  SlideContent,
  SlideContentSection,
} from "@/features/deck/components/DeckEditor/SlideContent/SlideContentSection";
import { useSortable } from "@dnd-kit/react/sortable";
import { CSSProperties, useEffect, useState } from "react";
import { DragDropWrapper } from "../../Wrappers/DragDropWrapper";
import { useAnimatedChartData } from "../useAnimatedChartData";
import { withChartErrorBoundary } from "../withChartErrorBoundary";
import styles from "./PoolRibbon.module.css";

const POOL_POINTS = 100;
const MINUS_SIGN = "−";
const REVEAL_STAGGER_MS = 80;

const toPoints = (votes: number, totalVotes: number): number =>
  totalVotes > 0 ? (votes / totalVotes) * POOL_POINTS : 0;

const toEvenSplit = (optionCount: number): number =>
  optionCount > 0 ? POOL_POINTS / optionCount : 0;

const formatDelta = (points: number, evenSplit: number): string => {
  const delta = Math.round((points - evenSplit) * 10) / 10;
  if (delta === 0) return "even split";
  return `${delta > 0 ? "+" : MINUS_SIGN}${Math.abs(delta).toFixed(1)} pts vs even split`;
};

interface PoolRibbonCardProps {
  editableItem: EditableItem<"MCQ">;
  points: number;
  evenSplit: number;
  leaderPoints: number;
}

const PoolRibbonCard = ({ editableItem, points, evenSplit, leaderPoints }: PoolRibbonCardProps) => {
  const { ref, handleRef, isDragging } = useSortable({
    id: editableItem.item.id,
    index: editableItem.sourceIndex,
  });

  const sortable = { rootRef: ref, handleRef: handleRef, isDragging: isDragging };
  const meterShare = leaderPoints > 0 ? (points / leaderPoints) * 100 : 0;

  return (
    <li
      ref={sortable.rootRef}
      className={styles.card}
      style={
        {
          "--option-color": editableItem.item.color,
          "--meter-share": `${meterShare.toFixed(1)}%`,
        } as CSSProperties
      }
    >
      <ItemChartLegend sortable={sortable} {...editableItem} placement="side" />
      <p className={styles.valueRow}>
        <span className={styles.value}>{points.toFixed(1)}</span>
        <span className={styles.unit}>pts</span>
      </p>
      <div className={styles.meter}>
        <span className={styles.meterFill} />
      </div>
      <p className={styles.meterCaption}>{formatDelta(points, evenSplit)}</p>
    </li>
  );
};

/**
 * Reads an MCQ tally as a 100-point pool the crowd has split between the
 * options: one proportional ribbon segment per option, ticks marking where an
 * even split would fall, and a stat card per option carrying its points, its
 * share of the leader, and its distance from that even split.
 */
const PoolRibbonInner = (props: RenderMcqResultsDisplayOptions) => {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setRevealed(true);
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, []);

  const data = useAnimatedChartData(props.editor.question);

  if (props.editor.question == null || data == null) return <div>no question</div>;
  const { distribution, highestValue, denominator, optionCount } = data;

  const editableItems = props.editor.question.options.map((option, index) => {
    return OptionToEditableMcqItem(
      option,
      index,
      props.editor.actions,
      props.editor.state,
      props.openPicker,
      props.setOpenMenuId,
      props.openMenuId,
      distribution[option.id],
      highestValue,
      denominator,
      optionCount,
    );
  });

  const evenSplit = toEvenSplit(optionCount);
  const leaderPoints = toPoints(highestValue, denominator);
  const tickPositions = Array.from(
    { length: Math.max(optionCount - 1, 0) },
    (_, index) => ((index + 1) / optionCount) * 100,
  );

  return (
    <SlideContent>
      <SlideContentSection>
        <SlideContentSection.Body>
          <div className={`${styles.chart} ${revealed ? styles.revealed : ""}`}>
            <div className={styles.head}>
              <span className={styles.headTitle}>Crowd vote split</span>
              <span className={styles.headPool}>pool {POOL_POINTS.toString()} pts</span>
            </div>

            <div className={styles.ribbon} aria-hidden="true">
              {editableItems.map((editableItem) => {
                const points = toPoints(editableItem.detail.mockDistributionValue, denominator);
                return (
                  <div
                    key={editableItem.item.id}
                    className={styles.segment}
                    style={
                      {
                        "--segment-color": editableItem.item.color,
                        "--segment-share": `${points.toFixed(3)}%`,
                        "--reveal-delay": `${(editableItem.sourceIndex * REVEAL_STAGGER_MS).toString()}ms`,
                      } as CSSProperties
                    }
                  >
                    <span className={styles.segmentValue}>{Math.round(points).toString()}</span>
                    <span className={styles.segmentUnit}>pts</span>
                  </div>
                );
              })}
            </div>

            {tickPositions.length > 0 && (
              <div className={styles.ticks}>
                <div className={styles.tickRail} aria-hidden="true">
                  {tickPositions.map((position) => (
                    <span
                      key={position}
                      className={styles.tick}
                      style={{ "--tick-position": `${position.toFixed(3)}%` } as CSSProperties}
                    />
                  ))}
                </div>
                <p className={styles.ticksCaption}>
                  ticks mark an even {evenSplit.toFixed(1)}-pt split
                </p>
              </div>
            )}

            <ul className={styles.cards}>
              <DragDropWrapper onReorder={props.editor.actions.handleItemDragEnd}>
                {editableItems.map((editableItem) => (
                  <PoolRibbonCard
                    key={editableItem.item.id}
                    editableItem={editableItem}
                    points={toPoints(editableItem.detail.mockDistributionValue, denominator)}
                    evenSplit={evenSplit}
                    leaderPoints={leaderPoints}
                  />
                ))}
              </DragDropWrapper>
              {props.editor.state.canAddItem && (
                <AddItemCard
                  label={"Add option"}
                  disabled={!props.editor.state.canAddItem}
                  onAdd={props.editor.actions.addItem}
                />
              )}
            </ul>

            <p className={styles.footer}>
              pool {POOL_POINTS.toString()} pts ·{" "}
              {denominator > 0
                ? `each option's share of ${denominator.toString()} votes`
                : "no votes yet"}
            </p>
          </div>
        </SlideContentSection.Body>
      </SlideContentSection>
    </SlideContent>
  );
};

const PoolRibbon = withChartErrorBoundary("poolRibbon", PoolRibbonInner);

export { PoolRibbon };
