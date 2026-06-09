/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { RectangleStackIcon } from "@heroicons/react/24/outline";
import { fn } from "storybook/test";
import { SelectableTile } from "./SelectableTile";

const SIZES: NonNullable<React.ComponentProps<typeof SelectableTile>["size"]>[] =
  ["sm", "md", "lg"];

const meta = {
  title: "Common/SelectableTile/SelectableTile",
  component: SelectableTile,
  tags: ["autodocs"],
  args: {
    title: "Multiple choice",
    meta: "Question type",
    description: "Pick one correct answer from a list of options.",
    size: "md",
    onClick: fn(),
  },
  argTypes: {
    size: { control: "inline-radio", options: SIZES },
  },
} satisfies Meta<typeof SelectableTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMedia: Story = {
  args: {
    media: <RectangleStackIcon style={{ width: "2rem", height: "2rem" }} />,
    badge: "New",
  },
};

export const Selected: Story = {
  args: { selected: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
      {SIZES.map((size) => (
        <SelectableTile
          key={size}
          size={size}
          title={size}
          description="Selectable tile body text."
          onClick={fn()}
        />
      ))}
    </div>
  ),
};
