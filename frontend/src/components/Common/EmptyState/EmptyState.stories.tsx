import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { InboxIcon } from "@heroicons/react/24/outline";
import { fn } from "storybook/test";
import { EmptyState } from "./EmptyState";

const SIZES = ["sm", "md", "lg"] as const;

const meta = {
  title: "Common/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  args: {
    title: "No decks yet",
    message: "Create your first deck to get started.",
    size: "md",
  },
  argTypes: {
    size: { control: "inline-radio", options: SIZES },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TitleOnly: Story = {
  args: { message: undefined },
};

export const WithIcon: Story = {
  args: {
    icon: <InboxIcon style={{ width: "2.5rem", height: "2.5rem" }} />,
  },
};

export const WithAction: Story = {
  args: {
    icon: <InboxIcon style={{ width: "2.5rem", height: "2.5rem" }} />,
    action: (
      <button type='button' onClick={fn()}>
        Create a deck
      </button>
    ),
  },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {SIZES.map((size) => (
        <EmptyState key={size} {...args} size={size} title={size} />
      ))}
    </div>
  ),
};
