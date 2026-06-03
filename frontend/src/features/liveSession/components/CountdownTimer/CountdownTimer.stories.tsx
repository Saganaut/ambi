import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { fn } from "storybook/test";
import { CountdownTimer } from "./CountdownTimer";

// CountdownTimer renders a self-contained SVG ring and drives its own rAF loop
// from props. It reads no Redux/RTK Query state, so no withStore decorator is
// needed.
const meta = {
  title: "Common/CountdownTimer",
  component: CountdownTimer,
  tags: ["autodocs"],
  args: {
    duration: 30,
    running: true,
    size: "md",
    urgentThreshold: 5,
    onComplete: fn(),
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
  },
} satisfies Meta<typeof CountdownTimer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Paused: Story = {
  args: { running: false },
};

export const Urgent: Story = {
  args: { duration: 4 },
};

export const Large: Story = {
  args: { size: "lg", duration: 60 },
};
