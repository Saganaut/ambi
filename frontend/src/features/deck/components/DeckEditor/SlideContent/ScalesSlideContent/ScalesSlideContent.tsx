/**
 * The Scales slide's canvas: prompt, scoring footer, and whichever results view
 * the author has chosen — the statement/scale editing plane by default, the
 * sample diverging bar while DIVERGING_BAR is picked or hovered
 * (`renderScalesResultsDisplay`).
 */
import { useResultsPreview } from "@/features/deck/contexts/useResultsPreview";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { useScalesEditor } from "@deck/hooks/useScalesEditor";
import { EmptySelect } from "../_shared";
import { SlideContentProps } from "../_shared/Item.types";
import { SlideWrapper } from "../SlideWrapper";
import { renderScalesResultsDisplay } from "./renderScalesResultsDisplay";
import { isScalesVisualization } from "./scalesResults.types";
import { useScalesDraft } from "./useScalesDraft";

const ScalesSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useScalesEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker(deckId);
  const { previewVisualization, selectedVisualization } = useResultsPreview();
  const {
    prompt,
    setPrompt,
    min,
    setMin,
    max,
    setMax,
    leftLabel,
    setLeftLabel,
    rightLabel,
    setRightLabel,
    openMenuId,
    setOpenMenuId,
  } = useScalesDraft({ question });

  if (!question) return <EmptySelect title="Scales" />;

  const effective = previewVisualization ?? selectedVisualization(slideId);

  return (
    <SlideWrapper
      prompt={{
        idBase: `scales-${question.id}`,
        value: prompt,
        placeholder: "What are players rating?",
        onChange: (html: string) => {
          setPrompt(html);
          editor.actions.scheduleQuestionPrompt(html);
        },
        onBlur: editor.actions.flush,
      }}
      footer={
        <p>
          {question.scored
            ? "Players are scored when their rating lands within the tolerance of a statement's answer."
            : "Unscored — collect and show how players rated each statement."}
        </p>
      }
    >
      {renderScalesResultsDisplay({
        visualization: isScalesVisualization(effective) ? effective : null,
        question,
        editor,
        openPicker,
        openMenuId,
        setOpenMenuId,
        min,
        setMin,
        max,
        setMax,
        leftLabel,
        setLeftLabel,
        rightLabel,
        setRightLabel,
      })}
    </SlideWrapper>
  );
};

export { ScalesSlideContent };
