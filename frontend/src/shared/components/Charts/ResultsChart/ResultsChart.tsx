// The one place that maps a `ChartType` to a concrete renderer. Both the deck
// editor's results preview and the live session board render through this, so a
// new visualisation is wired in exactly once. Callers hand it already-normalised
// `ChartDatum[]` (produced by a question type's results adapter) plus the chosen
// `viz`; "NONE" renders nothing. Keeping the switch here — rather than at each
// call site — is what lets the same aggregated data fan out to any chart.
import { CorrectToggle } from "@/features/deck/components/DeckEditor/SlideContent/_shared/OptionControls/CorrectToggle";
import { Label } from "@/features/deck/components/DeckEditor/SlideContent/_shared/OptionControls/Label";
import { Menu } from "@/features/deck/components/DeckEditor/SlideContent/_shared/OptionControls/Menu";
import { useMcqSlideContext } from "@/features/deck/components/DeckEditor/SlideContent/McqSlideContent/useMcqSlideContext";
import { McqOption } from "@/features/deck/store/deckApi.gen";
import { useState } from "react";
import { BarChart } from "../BarChart/BarChart";
import { DotPlot } from "../DotPlot/DotPlot";
import { LineChart } from "../LineChart/LineChart";
import { ParetoChart } from "../ParetoChart/ParetoChart";
import { PieChart } from "../PieChart/PieChart";
import { ChartDatum, type ChartProps, type ChartType } from "../types";
import { SortableDragHandle } from "./SortableDragHandle";

// ResultsChart owns `chartMode` (always editable here) and generates the
// label/menu/toggle render props from the slide's editor context, so callers
// only supply the data + the chosen visualisation.
export interface ResultsChartProps
  extends Pick<ChartProps, "data" | "caption" | "displayAsPercentage" | "animateOnMount"> {
  viz: ChartType;
}

const ResultsChart = ({
  viz,
  data,
  caption,
  animateOnMount,
  displayAsPercentage,
}: ResultsChartProps) => {
  const { editor, openPicker } = useMcqSlideContext();

  const { flush, scheduleOption, canRemove, isCorrect, commitOption, toggleCorrect, removeOption } =
    editor;

  const [openOptionId, setOpenOptionId] = useState<string | null>(null);

  // Separate render props so each chart can place the option's controls
  // independently. `index` is the option's position in the slide's list (via
  // `data`, which is in option order) so reorder + the "Option N" label stay
  // correct even for charts that sort their display (e.g. Pareto).
  const optionIndex = (datum: ChartDatum) => data.findIndex((d) => d.id === datum.id);

  const renderLabel = (datum: ChartDatum) => (
    <Label
      option={datum}
      flush={flush}
      onScheduleText={(next: McqOption) => {
        scheduleOption(datum.id, next);
      }}
    />
  );

  const renderToggle = (datum: ChartDatum) => (
    <CorrectToggle
      isCorrect={isCorrect(datum.id)}
      onToggleCorrect={() => {
        toggleCorrect(datum.id);
      }}
    />
  );

  const renderMenu = (datum: ChartDatum) => (
    <Menu
      activeOption={datum}
      activeOptionId={datum.id}
      index={optionIndex(datum)}
      isOpen={openOptionId === datum.id}
      onOpenChange={(open) => {
        setOpenOptionId(open ? datum.id : null);
      }}
      canRemove={canRemove}
      onScheduleText={(next: McqOption) => {
        scheduleOption(datum.id, next);
      }}
      onCommit={(next: McqOption) => {
        commitOption(datum.id, next);
      }}
      onRemove={() => {
        removeOption(datum.id);
      }}
      flush={flush}
      openPicker={openPicker}
    />
  );

  const renderDragHandle = (datum: ChartDatum) => (
    <SortableDragHandle id={datum.id} index={optionIndex(datum)} />
  );

  switch (viz) {
    case "NONE":
      return <p>Placeholder</p>;

    case "PIE":
      return (
        <PieChart
          chartMode={"editable"}
          variant="pie"
          data={data}
          caption={caption}
          animateOnMount={animateOnMount}
          renderLabel={renderLabel}
          renderToggle={renderToggle}
          renderMenu={renderMenu}
          renderDragHandle={renderDragHandle}
          displayAsPercentage={displayAsPercentage}
        />
      );
    case "DONUT":
      return (
        <PieChart
          variant="donut"
          data={data}
          chartMode={"editable"}
          caption={caption}
          animateOnMount={animateOnMount}
          renderLabel={renderLabel}
          renderToggle={renderToggle}
          renderMenu={renderMenu}
          renderDragHandle={renderDragHandle}
          displayAsPercentage={displayAsPercentage}
        />
      );
    case "BAR_HORIZONTAL":
      return (
        <BarChart
          orientation="horizontal"
          data={data}
          chartMode={"editable"}
          caption={caption}
          animateOnMount={animateOnMount}
          renderLabel={renderLabel}
          renderToggle={renderToggle}
          renderMenu={renderMenu}
          renderDragHandle={renderDragHandle}
          displayAsPercentage={displayAsPercentage}
        />
      );
    case "BAR_VERTICAL":
      return (
        <BarChart
          orientation="vertical"
          data={data}
          chartMode={"editable"}
          caption={caption}
          animateOnMount={animateOnMount}
          renderLabel={renderLabel}
          renderToggle={renderToggle}
          renderMenu={renderMenu}
          renderDragHandle={renderDragHandle}
          displayAsPercentage={displayAsPercentage}
        />
      );
    case "LINE":
      return (
        <LineChart
          data={data}
          chartMode={"editable"}
          caption={caption}
          animateOnMount={animateOnMount}
          renderLabel={renderLabel}
          renderToggle={renderToggle}
          renderMenu={renderMenu}
          renderDragHandle={renderDragHandle}
          displayAsPercentage={displayAsPercentage}
        />
      );
    case "PARETO":
      return (
        <ParetoChart
          data={data}
          chartMode={"editable"}
          caption={caption}
          animateOnMount={animateOnMount}
          renderLabel={renderLabel}
          renderToggle={renderToggle}
          renderMenu={renderMenu}
          renderDragHandle={renderDragHandle}
          displayAsPercentage={displayAsPercentage}
        />
      );
    case "DOT":
      return (
        <DotPlot
          data={data}
          chartMode={"editable"}
          caption={caption}
          animateOnMount={animateOnMount}
          renderLabel={renderLabel}
          renderToggle={renderToggle}
          renderMenu={renderMenu}
          renderDragHandle={renderDragHandle}
          displayAsPercentage={displayAsPercentage}
        />
      );
    default: {
      const _exhaustive: never = viz;
      return _exhaustive;
    }
  }
};

export { ResultsChart };
