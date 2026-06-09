/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { ProgressBar } from "./ProgressBar";

const VARIANTS: NonNullable<React.ComponentProps<typeof ProgressBar>["variant"]>[] =
  ["default", "brand", "success", "warning", "error"];
const SIZES: NonNullable<React.ComponentProps<typeof ProgressBar>["size"]>[] = [
  "sm",
  "md",
  "lg",
];

const meta = {
  title: "Common/ProgressBar/ProgressBar",
  component: ProgressBar,
  tags: ["autodocs"],
  args: {
    value: 60,
    max: 100,
    variant: "default",
    size: "md",
    showLabel: false,
  },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    size: { control: "inline-radio", options: SIZES },
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: { showLabel: true, label: "Uploading", value: 7, max: 12 },
};

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: 320 }}>
      {VARIANTS.map((variant) => (
        <ProgressBar key={variant} {...args} variant={variant} showLabel label={variant} />
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: 320 }}>
      {SIZES.map((size) => (
        <ProgressBar key={size} {...args} size={size} />
      ))}
    </div>
  ),
};

export const Indeterminate: Story = {
  args: { indeterminate: true },
};
