/**
 * Density heatmap of where a crowd placed the slide's items, for the two
 * placement kinds: AXIS shades its labelled plane, PLACE_ON_IMAGE its backing
 * image. It is those kinds' only results visualisation, so the component takes
 * their shared editor options rather than bare `ChartProps` — the same
 * editor-coupled contract PieChart and DotPlot take for MCQ.
 *
 * The cells are the buckets `placementSampleDensity` counted, at the same
 * resolution the backend quantizes real answers at, shaded by each bucket's
 * share of the busiest one and swept in on mount. Density is aggregated across
 * items (an item's own colour lives in the legend below, as on the live board),
 * and the plane's y axis inverts on the way out — the sampler counts in the
 * grader's space, not the screen's.
 */
import {
  AddItemCard,
  SortableItemChartLegend,
} from "@/features/deck/components/DeckEditor/SlideContent/_shared";
import type { EditableItem } from "@/features/deck/components/DeckEditor/SlideContent/_shared/Item.types";
import type { PlacementResultsDisplayOptions } from "@/features/deck/components/DeckEditor/SlideContent/_shared/placement/placementResults.types";
import {
  ItemToEditableAxisItem,
  ItemToEditablePlaceOnImageItem,
} from "@/features/deck/components/DeckEditor/SlideContent/AllocationSlideContent/ItemFormatters";
import {
  SlideContent,
  SlideContentSection,
} from "@/features/deck/components/DeckEditor/SlideContent/SlideContentSection";
import type { AxisQuestionView } from "@deck/hooks/useAxisEditor";
import { MAX_AXIS_ITEMS } from "@deck/hooks/useAxisEditor";
import { MAX_PLACE_TARGETS } from "@deck/hooks/usePlaceOnImageEditor";
import { largestUrl } from "@utils/image";
import { useEffect, useState, type CSSProperties } from "react";
import { AppImg } from "../../Images/AppImg";
import { DragDropWrapper } from "../../Wrappers/DragDropWrapper";
import { placementSampleDensity } from "../adapters/placement";
import { withChartErrorBoundary } from "../withChartErrorBoundary";
import styles from "./Heatmap.module.css";

/** Per-cell delay of the mount sweep, capped so a busy grid still finishes fast. */
const CELL_STAGGER_MS = 12;
const MAX_STAGGER_MS = 400;

type PlacementEditableItem = EditableItem<"AXIS"> | EditableItem<"PLACE_ON_IMAGE">;

const buildLegendItems = (options: PlacementResultsDisplayOptions): PlacementEditableItem[] => {
  const { tolerance, openPicker, setOpenMenuId, openMenuId, selectedItemId, setSelectedItemId } =
    options;

  if (options.kind === "AXIS") {
    const { question, editor } = options;
    return question.items.map((item, index) =>
      ItemToEditableAxisItem(
        item,
        index,
        editor.actions,
        editor.state,
        tolerance,
        openPicker,
        setOpenMenuId,
        openMenuId,
        selectedItemId,
        setSelectedItemId,
        question.correctPositions,
      ),
    );
  }

  const { question, editor } = options;
  return question.targets.map((target, index) =>
    ItemToEditablePlaceOnImageItem(
      target,
      index,
      editor.actions,
      editor.state,
      tolerance,
      openPicker,
      setOpenMenuId,
      openMenuId,
      selectedItemId,
      setSelectedItemId,
      question.correctPositions,
    ),
  );
};

/** The plane's chrome, restated read-only: centre lines plus the four endpoint pills. */
const AxisPlaneBackdrop = ({ question }: { question: AxisQuestionView }) => {
  const pill = (edgeClass: string, label: string, fallback: string) => (
    <span className={[styles.endpointOverlay, edgeClass].join(" ")}>
      <span className={styles.endpointPill}>{label.trim() || fallback}</span>
    </span>
  );

  return (
    <>
      <span className={styles.planeAxisLineX} aria-hidden="true" />
      <span className={styles.planeAxisLineY} aria-hidden="true" />
      {pill(styles.endpointTop, question.yHighLabel, "Y high")}
      {pill(styles.endpointBottom, question.yLowLabel, "Y low")}
      {pill(styles.endpointLeft, question.xLowLabel, "X low")}
      {pill(styles.endpointRight, question.xHighLabel, "X high")}
    </>
  );
};

const HeatmapInner = (props: PlacementResultsDisplayOptions) => {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setRevealed(true);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  const isAxis = props.kind === "AXIS";
  const legendItems = buildLegendItems(props);
  const density = placementSampleDensity(
    legendItems.map((legendItem) => ({
      id: legendItem.item.id,
      target: legendItem.detail.target,
    })),
    { tolerance: props.tolerance },
  );
  const buckets = density.buckets;

  const imageUrl =
    props.kind === "PLACE_ON_IMAGE" ? largestUrl(props.question.image, props.question.id) : null;
  const cellSize = `${(100 / buckets).toString()}%`;

  const heatCells = density.cells.map((cell, index) => {
    const rowFromTop = isAxis ? buckets - cell.bucketY - 1 : cell.bucketY;
    return (
      <span
        key={cell.key}
        className={[styles.heatCell, revealed ? styles.revealed : ""].filter(Boolean).join(" ")}
        aria-hidden="true"
        style={
          {
            left: `${((cell.bucketX / buckets) * 100).toString()}%`,
            top: `${((rowFromTop / buckets) * 100).toString()}%`,
            width: cellSize,
            height: cellSize,
            "--heat": cell.total / density.highestTotal,
            transitionDelay: `${Math.min(index * CELL_STAGGER_MS, MAX_STAGGER_MS).toString()}ms`,
          } as CSSProperties
        }
      />
    );
  });

  return (
    <SlideContent>
      <SlideContentSection>
        <SlideContentSection.Header>
          <span>Response density</span>
          <span className={styles.sampleNote}>{density.total} sample responses</span>
        </SlideContentSection.Header>
        <SlideContentSection.Body>
          {props.kind === "PLACE_ON_IMAGE" && imageUrl == null ? (
            <p className={styles.empty}>Choose a backing image to preview the density.</p>
          ) : (
            <div
              className={isAxis ? styles.plane : styles.imagePlane}
              role="img"
              aria-label={`Response density heatmap — ${density.total.toString()} sample responses`}
            >
              {props.kind === "AXIS" ? (
                <AxisPlaneBackdrop question={props.question} />
              ) : (
                <AppImg className={styles.image} src={imageUrl} alt="" draggable={false} />
              )}
              {heatCells}
            </div>
          )}
        </SlideContentSection.Body>
      </SlideContentSection>

      <SlideContentSection>
        <SlideContentSection.Body>
          <div className={styles.legend}>
            <DragDropWrapper onReorder={props.editor.actions.handleItemDragEnd}>
              {legendItems.map((legendItem) => (
                <SortableItemChartLegend
                  key={legendItem.item.id}
                  {...legendItem}
                  placement="side"
                />
              ))}
            </DragDropWrapper>
            <AddItemCard
              label={
                props.editor.state.canAddItem
                  ? isAxis
                    ? "Add item"
                    : "Add target"
                  : isAxis
                    ? `Maximum ${MAX_AXIS_ITEMS.toString()} items`
                    : `Maximum ${MAX_PLACE_TARGETS.toString()} targets`
              }
              disabled={!props.editor.state.canAddItem}
              onAdd={props.editor.actions.addItem}
            />
          </div>
        </SlideContentSection.Body>
      </SlideContentSection>
    </SlideContent>
  );
};

const Heatmap = withChartErrorBoundary("heatmap", HeatmapInner);

export { Heatmap };
