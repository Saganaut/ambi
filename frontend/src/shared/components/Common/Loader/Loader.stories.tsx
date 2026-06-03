import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { Loader } from "./Loader";

const meta = {
  title: "Common/Loader",
  component: Loader,
  tags: ["autodocs"],
  args: {
    withMessage: true,
  },
} satisfies Meta<typeof Loader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomMessage: Story = {
  args: { message: "Fetching your decks…" },
};

export const SpinnerOnly: Story = {
  args: { withMessage: false },
};
