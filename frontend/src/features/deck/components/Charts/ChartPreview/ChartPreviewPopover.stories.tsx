/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { ChartPreviewPopover } from "./ChartPreviewPopover";
import { ChartType } from "../../DeckEditor/RightSidebar/data";

const CHART_TYPES: ChartType[] = [
  "BAR_HORIZONTAL",
  "BAR_VERTICAL",
  "WORD_CLOUD",
  "PIE_CHART",
];

const PLACEMENTS = ["left", "right", "top", "bottom"] as const;

const meta = {
  title: "Common/Charts/ChartPreviewPopover",
  component: ChartPreviewPopover,
  tags: ["autodocs"],
  args: {
    chartType: "BAR_HORIZONTAL",
    label: "Horizontal bars",
    placement: "bottom",
    children: <button type='button'>Hover to preview</button>,
  },
  argTypes: {
    chartType: { control: "inline-radio", options: CHART_TYPES },
    placement: { control: "inline-radio", options: PLACEMENTS },
  },
  // The popover renders in the top layer relative to the trigger; centre the
  // trigger so it has room to flip on any side.
  render: (args) => (
    <div style={{ display: "flex", justifyContent: "center", padding: "6rem" }}>
      <ChartPreviewPopover {...args} />
    </div>
  ),
} satisfies Meta<typeof ChartPreviewPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PieOnTop: Story = {
  args: {
    chartType: "PIE_CHART",
    label: "Pie chart",
    placement: "top",
  },
};

export const WordCloudRight: Story = {
  args: {
    chartType: "WORD_CLOUD",
    label: "Word cloud",
    placement: "right",
  },
};
