import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoadingFallback } from "./LoadingFallback";

const meta = {
  title: "Common/BoundaryFallbacks/LoadingFallback",
  component: LoadingFallback,
  tags: ["autodocs"],
} satisfies Meta<typeof LoadingFallback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomMessage: Story = {
  args: { message: "Loading this section…" },
};
