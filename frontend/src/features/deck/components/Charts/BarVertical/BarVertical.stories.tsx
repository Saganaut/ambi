/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { BarVertical } from "./BarVertical";
import { NUMBER_BINS, SCALE_RESPONSES } from "./BarVertical.mocks";

const meta = {
  title: "Common/Charts/BarVertical",
  component: BarVertical,
  tags: ["autodocs"],
  args: {
    items: NUMBER_BINS,
    caption: "How many Nazgûl did you spot?",
    animateOnMount: false,
  },
  argTypes: {
    animateOnMount: { control: "boolean" },
  },
  // Vertical bars rise from a baseline, so they need a sized frame to read.
  render: (args) => (
    <div style={{ width: 480, height: 280 }}>
      <BarVertical {...args} />
    </div>
  ),
} satisfies Meta<typeof BarVertical>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Animated: Story = {
  args: { animateOnMount: true },
};

export const ScaleResponses: Story = {
  args: { items: SCALE_RESPONSES, caption: "Agreement with the statement" },
};
