import { useResultsPreview } from "@/features/deck/contexts/useResultsPreview";
import { McqSlideContentView } from "./McqSlideContentView";
import { useMcqSlideContext } from "./useMcqSlideContext";

const McqSlideContent = () => {
  const { previewVisualization } = useResultsPreview();
  const { editor, openPicker, answerSettings } = useMcqSlideContext();

  return (
    <McqSlideContentView
      UseMcqEditorResult={editor}
      previewVisualization={previewVisualization}
      openPicker={openPicker}
      answerSettings={answerSettings}
      editor={editor}
    />
  );
};

export { McqSlideContent };
