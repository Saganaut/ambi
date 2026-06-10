/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "./Avatar";

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

const meta = {
  title: "Common/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  args: { name: "Frodo Baggins", size: "md" },
  argTypes: {
    size: { control: "inline-radio", options: SIZES },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

// No src and no resolvable image → initial fallback ("F").
export const Initial: Story = {};

// No name → generic person icon fallback.
export const IconFallback: Story = {
  args: { name: undefined },
};

export const WithImage: Story = {
  args: {
    name: "Gandalf",
    src: "https://i.pravatar.cc/150?img=68",
  },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      {SIZES.map((size) => (
        <Avatar key={size} {...args} size={size} />
      ))}
    </div>
  ),
};
