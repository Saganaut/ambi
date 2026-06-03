import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { BarChart } from "./BarChart";
import { EVEN_SPLIT, MCQ_OPTION_COUNTS, ROUND_SCORES } from "./BarChart.mocks";

const meta = {
  title: "Common/Charts/BarChart",
  component: BarChart,
  tags: ["autodocs"],
  args: {
    items: MCQ_OPTION_COUNTS,
    caption: "Which hobbit carried the Ring to Mordor?",
  },
} satisfies Meta<typeof BarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHighlight: Story = {
  args: {
    items: MCQ_OPTION_COUNTS,
    caption: "Correct answer highlighted",
  },
};

export const NoCaption: Story = {
  args: { items: ROUND_SCORES, caption: undefined },
};

export const ExplicitTotal: Story = {
  args: {
    items: EVEN_SPLIT,
    total: 100,
    caption: "Shares computed against an explicit total of 100",
  },
};
