import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { BarHorizontal } from "./BarHorizontal";
import { ALLOCATION_BUCKETS, OPTION_COUNTS } from "./BarHorizontal.mocks";

const meta = {
  title: "Common/Charts/BarHorizontal",
  component: BarHorizontal,
  tags: ["autodocs"],
  args: {
    items: OPTION_COUNTS,
    caption: "Which wizard led the Fellowship?",
    animateOnMount: false,
  },
  argTypes: {
    animateOnMount: { control: "boolean" },
  },
} satisfies Meta<typeof BarHorizontal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Animated: Story = {
  args: { animateOnMount: true },
};

export const ManyBars: Story = {
  args: { items: ALLOCATION_BUCKETS, caption: "Votes by realm" },
};

export const ExplicitTotal: Story = {
  args: { total: 100, caption: "Shares against an explicit total of 100" },
};
