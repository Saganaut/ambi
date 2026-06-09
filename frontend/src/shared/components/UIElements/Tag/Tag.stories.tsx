/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { fn } from "storybook/test";
import { Tag } from "./Tag";

const SIZES: NonNullable<React.ComponentProps<typeof Tag>["size"]>[] = [
  "sm",
  "md",
];

const meta = {
  title: "Common/Tag/Tag",
  component: Tag,
  tags: ["autodocs"],
  args: { children: "Fantasy", size: "md" },
  argTypes: {
    size: { control: "inline-radio", options: SIZES },
  },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Removable: Story = {
  args: { children: "Removable", onRemove: fn() },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      {SIZES.map((size) => (
        <Tag key={size} {...args} size={size}>
          {size}
        </Tag>
      ))}
    </div>
  ),
};
