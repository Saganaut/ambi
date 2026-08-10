import { mcqSampleDistribution } from "@/shared/components/Charts/adapters/mcq";
import { ChartType } from "@/shared/components/Charts/Chart.types";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { type UseMcqEditorResult } from "@deck/hooks/useMcqEditor";
import { SlideWrapper } from "../SlideWrapper";
import styles from "./McqSlideContent.module.css";
import { renderMcqResultsDisplay } from "./renderMcqResultsDisplay";
import { useMcqDraft } from "./UseMcqDraft";

export interface McqSlideContentViewProps {
  previewVisualization: ChartType | null;
  openPicker: OpenGalleryPicker;
  editor: UseMcqEditorResult;
}
const McqSlideContentView = ({
  editor,
  openPicker,
  previewVisualization,
}: McqSlideContentViewProps) => {
  const { question, actions } = editor;
  const noCorrectAnswerWarning = "Not setting a correct answer means this slide is not scoreable.";
  const effective = previewVisualization ?? question?.dataVisualization;
  const { setPrompt, prompt, setOpenMenuId, openMenuId } = useMcqDraft({ question });

  if (!question) {
    return (
      <SlideWrapper title="Multiple choice">
        <p>Select a slide to edit.</p>
      </SlideWrapper>
    );
  }
  const mockPreviewDistribution = mcqSampleDistribution(question.options);

  const sharedProps = {
    visualization: effective ?? null,
    editor,
    openPicker,
    setOpenMenuId,
    openMenuId,
    mockPreviewDistribution,
  };

  const hasCorrectAnswer = question.correctOptionIds.length > 0;

  if (question == null) return <p> no question</p>;

  return (
    <SlideWrapper
      prompt={{
        idBase: `mcq-${question.id}`,
        value: prompt,
        placeholder: "Type your question…",
        onChange: (html: string) => {
          setPrompt(html);
          actions.scheduleQuestionPrompt(html);
        },
        onBlur: actions.flush,
      }}
      footer={
        <p className={hasCorrectAnswer ? styles.footerPlaceholder : undefined}>
          {noCorrectAnswerWarning}
        </p>
      }
    >
      {effective ? (
        <div className={styles.chartEditor}>
          {renderMcqResultsDisplay({
            ...sharedProps,
          })}
        </div>
      ) : (
        <div>Incorrect results type</div>
      )}
    </SlideWrapper>
  );
};

export { McqSlideContentView };
