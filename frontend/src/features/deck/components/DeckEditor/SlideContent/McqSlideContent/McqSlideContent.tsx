import { useResultsPreview } from "@/features/deck/contexts/useResultsPreview";
import { useMcqEditor } from "@/features/deck/hooks/useMcqEditor";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { SlideContentProps } from "../_shared/Item.types";
import { McqSlideContentView } from "./McqSlideContentView";

const McqSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useMcqEditor(deckId, slideId);
  const openPicker = useGalleryPicker(deckId);

  const { previewVisualization } = useResultsPreview();

  return (
    <McqSlideContentView
      previewVisualization={previewVisualization}
      openPicker={openPicker}
      editor={editor}
    />
  );
};

export { McqSlideContent };
