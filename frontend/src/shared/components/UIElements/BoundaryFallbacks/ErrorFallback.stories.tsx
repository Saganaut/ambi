import type { Meta, StoryObj } from "@storybook/react-vite";
import { ErrorFallback } from "./ErrorFallback";

const meta = {
  title: "Common/BoundaryFallbacks/ErrorFallback",
  component: ErrorFallback,
  tags: ["autodocs"],
} satisfies Meta<typeof ErrorFallback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomMessage: Story = {
  args: { message: "Couldn't load the leaderboard." },
};
