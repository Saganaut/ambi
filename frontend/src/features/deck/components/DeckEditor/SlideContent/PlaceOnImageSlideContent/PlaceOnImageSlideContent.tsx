/**
 * The Place-on-Image slide's canvas: prompt, scoring footer, and whichever
 * results view the author has chosen — the target-pinning image by default, the
 * sample heatmap while HEATMAP is picked or hovered
 * (`renderPlacementResultsDisplay`).
 */
import { useResultsPreview } from "@/features/deck/contexts/useResultsPreview";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { isPlaced, usePlaceOnImageEditor } from "@deck/hooks/usePlaceOnImageEditor";
import { largestUrl } from "@utils/image";
import { EmptySelect, ScoringFooter } from "../_shared";
import { SlideContentProps } from "../_shared/Item.types";
import { isPlacementVisualization } from "../_shared/placement/placementResults.types";
import { renderPlacementResultsDisplay } from "../_shared/placement/renderPlacementResultsDisplay";
import { SlideWrapper } from "../SlideWrapper";
import { usePlaceOnImageDraft } from "./usePlaceOnImageDraft";

const PlaceOnImageSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = usePlaceOnImageEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker(deckId);
  const { previewVisualization, selectedVisualization } = useResultsPreview();
  const {
    prompt,
    setPrompt,
    tolerance,
    setTolerance,
    openMenuId,
    setOpenMenuId,
    selectedItemId,
    setSelectedItemId,
  } = usePlaceOnImageDraft({ question });

  if (!question) return <EmptySelect title="Place on image" />;

  const { targets } = question;
  const hasImage = largestUrl(question.image, question.id) != null;
  const placedCount = targets.filter(isPlaced).length;
  const fullyAssigned = targets.length > 0 && placedCount === targets.length;

  const effective = previewVisualization ?? selectedVisualization(slideId);

  const footer = !hasImage ? (
    <ScoringFooter visible message="Choose a backing image for players to pin." />
  ) : fullyAssigned ? (
    <p>Scored when every pin lands inside its own target&apos;s tolerance circle.</p>
  ) : (
    <ScoringFooter
      visible
      message={
        targets.length === 0
          ? "Add at least one target to make this slide scoreable."
          : "Give every target a position to make this slide scoreable."
      }
    />
  );

  return (
    <SlideWrapper
      prompt={{
        idBase: `place-${question.id}`,
        value: prompt,
        placeholder: "Ask players to pin a spot on the image…",
        onChange: (html) => {
          setPrompt(html);
          editor.actions.scheduleQuestionPrompt(html);
        },
        onBlur: editor.actions.flush,
      }}
      footer={footer}
    >
      {renderPlacementResultsDisplay({
        kind: "PLACE_ON_IMAGE",
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

export { PlaceOnImageSlideContent };
