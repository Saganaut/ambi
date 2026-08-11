/**
 * The Axis slide's canvas: prompt, scoring footer, and whichever results view
 * the author has chosen — the target-editing plane by default, the sample
 * heatmap while HEATMAP is picked or hovered (`renderPlacementResultsDisplay`).
 */
import { useResultsPreview } from "@/features/deck/contexts/useResultsPreview";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { useAxisEditor } from "@deck/hooks/useAxisEditor";
import { EmptySelect, ScoringFooter } from "../_shared";
import { SlideContentProps } from "../_shared/Item.types";
import { isPlacementVisualization } from "../_shared/placement/placementResults.types";
import { renderPlacementResultsDisplay } from "../_shared/placement/renderPlacementResultsDisplay";
import { SlideWrapper } from "../SlideWrapper";
import { useAxisDraft } from "./useAxisDraft";

const AxisSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useAxisEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker(deckId);
  const { previewVisualization, selectedVisualization } = useResultsPreview();
  const {
    prompt,
    tolerance,
    setPrompt,
    setTolerance,
    openMenuId,
    setOpenMenuId,
    selectedItemId,
    setSelectedItemId,
  } = useAxisDraft({ question });

  if (!question) return <EmptySelect title="Axis" />;

  const { items, correctPositions } = question;
  const placedCount = items.filter((item) => correctPositions[item.id]).length;
  const fullyAssigned = items.length > 0 && placedCount === items.length;

  const effective = previewVisualization ?? selectedVisualization(slideId);

  return (
    <SlideWrapper
      prompt={{
        idBase: `axis-${question.id}`,
        value: prompt,
        placeholder: "Ask players to place the items on the plane…",
        onChange: (html) => {
          setPrompt(html);
          editor.actions.scheduleQuestionPrompt(html);
        },
        onBlur: editor.actions.flush,
      }}
      footer={
        fullyAssigned ? (
          <p>Scored when a player places every item within tolerance of its target.</p>
        ) : (
          <ScoringFooter
            visible
            message="Set a target position for every item to make this slide scoreable."
          />
        )
      }
    >
      {renderPlacementResultsDisplay({
        kind: "AXIS",
        visualization: isPlacementVisualization(effective) ? effective : null,
        question,
        editor,
        openPicker,
        openMenuId,
        setOpenMenuId,
        selectedItemId,
        setSelectedItemId,
        tolerance,
        setTolerance,
      })}
    </SlideWrapper>
  );
};

export { AxisSlideContent };
