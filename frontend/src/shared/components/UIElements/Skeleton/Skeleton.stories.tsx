/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./Skeleton";

const VARIANTS = ["text", "circle", "rect"] as const;

const meta = {
  title: "Common/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  args: {
    variant: "text",
    count: 1,
  },
  argTypes: {
    variant: { control: "inline-radio", options: VARIANTS },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {};

export const MultilineText: Story = {
  args: { count: 4 },
};

export const Circle: Story = {
  args: { variant: "circle", width: 48, height: 48 },
};

export const Rect: Story = {
  args: { variant: "rect", width: 240, height: 140 },
};

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
      <Skeleton {...args} variant='circle' width={48} height={48} />
      <Skeleton {...args} variant='rect' width={160} height={96} />
      <div style={{ flex: 1 }}>
        <Skeleton {...args} variant='text' count={3} />
      </div>
    </div>
  ),
};
