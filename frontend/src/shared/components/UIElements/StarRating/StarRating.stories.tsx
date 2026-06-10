/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { StarRating } from "./StarRating";

const SIZES: NonNullable<React.ComponentProps<typeof StarRating>["size"]>[] = [
  "sm",
  "md",
  "lg",
];

const meta = {
  title: "Common/StarRating/StarRating",
  component: StarRating,
  tags: ["autodocs"],
  args: {
    value: 4.3,
    mode: "display",
    size: "md",
    showValue: false,
  },
  argTypes: {
    mode: { control: "inline-radio", options: ["display", "input"] },
    size: { control: "inline-radio", options: SIZES },
  },
} satisfies Meta<typeof StarRating>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Display: Story = {};

export const WithValue: Story = {
  args: { showValue: true, value: 4.3, ratingCount: 52 },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {SIZES.map((size) => (
        <StarRating key={size} {...args} size={size} showValue />
      ))}
    </div>
  ),
};

// Interactive input mode owns its own value so clicking/keyboard updates render.
export const Input: Story = {
  args: { mode: "input", value: 3, onChange: fn(), onClear: fn() },
  render: (args) => {
    const [value, setValue] = useState<number | null>(args.value ?? null);
    return (
      <StarRating
        {...args}
        value={value}
        onChange={(next) => {
          args.onChange?.(next);
          setValue(next);
        }}
        onClear={() => {
          args.onClear?.();
          setValue(null);
        }}
      />
    );
  },
};
