/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { ChartPreview } from "./ChartPreview";
import { ChartType } from "../../DeckEditor/RightSidebar/data";

const CHART_TYPES: ChartType[] = [
  "BAR_HORIZONTAL",
  "BAR_VERTICAL",
  "WORD_CLOUD",
  "PIE_CHART",
];

const meta = {
  title: "Common/Charts/ChartPreview",
  component: ChartPreview,
  tags: ["autodocs"],
  args: {
    chartType: "BAR_HORIZONTAL",
  },
  argTypes: {
    chartType: { control: "inline-radio", options: CHART_TYPES },
  },
  // ChartPreview is sized by its parent; give it the popover-sized frame it
  // ships in so the animated preview reads correctly.
  render: (args) => (
    <div style={{ width: 300, height: 200 }}>
      <ChartPreview {...args} />
    </div>
  ),
} satisfies Meta<typeof ChartPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BarHorizontal: Story = {
  args: { chartType: "BAR_HORIZONTAL" },
};

export const BarVertical: Story = {
  args: { chartType: "BAR_VERTICAL" },
};

export const WordCloud: Story = {
  args: { chartType: "WORD_CLOUD" },
};

export const Pie: Story = {
  args: { chartType: "PIE_CHART" },
};

export const AllTypes: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
      {CHART_TYPES.map((chartType) => (
        <div key={chartType} style={{ width: 300, height: 200 }}>
          <ChartPreview chartType={chartType} />
        </div>
      ))}
    </div>
  ),
};
