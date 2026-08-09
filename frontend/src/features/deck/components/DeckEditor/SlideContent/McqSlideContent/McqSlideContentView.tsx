import { ChartType } from "@/shared/components/Charts/Chart.types";
import { useAnimatedChartData } from "@/shared/components/Charts/useAnimatedChartData";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { type UseMcqEditorResult } from "@deck/hooks/useMcqEditor";
import { useMcqDraft } from "../AllocationSlideContent/UseMcqDraft";
import { SlideWrapper } from "../SlideWrapper";
import styles from "./McqSlideContent.module.css";
import { renderMcqResultsDisplay } from "./renderMcqResultsDisplay";

export interface McqSlideContentViewProps {
  previewVisualization: ChartType | null;
  openPicker: OpenGalleryPicker;
  editor: UseMcqEditorResult;
}
//We are only seperating content from view for MCQ slides - a bit awkward and perhaps uncessary.
const McqSlideContentView = ({
  editor,
  openPicker,
  previewVisualization,
}: McqSlideContentViewProps) => {
  const { question, actions, state } = editor;
  const CONTINUOUS_ANIMATION = false;
  const noCorrectAnswerWarning = "Not setting a correct answer means this slide is not scoreable.";
  const effective = previewVisualization ?? question?.dataVisualization;
  const { data } = useAnimatedChartData(question, CONTINUOUS_ANIMATION);
  const { setPrompt, prompt, setOpenMenuId, openMenuId } = useMcqDraft({ question });

  const sharedProps = {
    editor,
    openPicker,
    data,
    setOpenMenuId,
    openMenuId,
  };

  if (!question) {
    return (
      <SlideWrapper title="Multiple choice">
        <p>Select a slide to edit.</p>
      </SlideWrapper>
    );
  }

  const hasCorrectAnswer = question.correctOptionIds.length > 0;

  // const renderLabelWithMenu = (datum: ChartDatum) => (
  //   <OptionField
  //     option={datum}
  //     paletteIndex={question.options.findIndex((option) => option.id === datum.id)}
  //     canRemove={state.canRemoveItem}
  //     isCorrect={actions.getIsScorable(datum.id)}
  //     open={openMenuId === datum.id}
  //     onOpenChange={(open) => {
  //       setOpenMenuId(open ? datum.id : null);
  //     }}
  //     onToggleCorrect={() => {
  //       actions.toggleScorability(datum.id);
  //     }}
  //     onScheduleText={(text: string) => {
  //       actions.scheduleItemLabel(datum.id, text);
  //     }}
  //     onSetColor={(color: string) => {
  //       actions.setItemColor(datum.id, color);
  //     }}
  //     onSetImage={(image: AppImage) => {
  //       actions.setItemImage(datum.id, image);
  //     }}
  //     onRemove={() => {
  //       actions.removeItem(datum.id);
  //     }}
  //     flush={actions.flush}
  //     openPicker={openPicker}
  //   />
  // );

  if (question == null) return <p> no question</p>;
  const _DISPLAY_AS_PERCANTAGE = false;
  // const sharedProps = {
  //   caption,
  //   animateOnMount,
  //   continuousAnimation,
  //   data,
  //   displayAsPercentage: _DISPLAY_AS_PERCANTAGE,
  //   renderLabelWithMenu,
  //   // renderMenu,
  //   onReorder: editor.handleOptionDragEnd,
  //   addOption: editor.addOption,
  //   canAddOption: editor.actionscanAddOption,
  // };

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
            sharedProps,
          })}
        </div>
      ) : (
        <div>Incorrect results type</div>
      )}
    </SlideWrapper>
  );
};

export { McqSlideContentView };
