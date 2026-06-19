import { useResultsPreview } from "@/features/deck/contexts/useResultsPreview";
import { useMcqEditor } from "@/features/deck/hooks/useMcqEditor";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { useSlideSettings } from "@deck/hooks/useSlideSettings";
import type { SlideContentProps } from "../slideContentProps";
import { McqSlideContentView } from "./McqSlideContentView";
import { McqSlideProvider } from "./McqSlideProvider";

const McqSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useMcqEditor(deckId, slideId);
  const openPicker = useGalleryPicker();
  // Whether results chart values render as a percentage of the total — a slide
  // answer setting (not MCQ-specific), so the preview matches the live board.
  const { answerSettings } = useSlideSettings(deckId, slideId);
  const displayAsPercentage = answerSettings?.displayResultsAsPercentage ?? false;
  const { previewVisualization } = useResultsPreview();

  // The container owns the single editor + picker; the provider re-exposes a
  // per-option editing slice so the card grid and inline chart labels share it.
  return (
    <McqSlideProvider deckId={deckId} slideId={slideId}>
      <McqSlideContentView
        UseMcqEditorResult={editor}
        displayAsPercentage={displayAsPercentage}
        previewVisualization={previewVisualization}
        openPicker={openPicker}
      />
    </McqSlideProvider>
  );
};

export { McqSlideContent };
