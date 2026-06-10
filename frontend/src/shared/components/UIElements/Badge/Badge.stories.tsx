/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./Badge";
import type { BtnVariant, BtnSize } from "../Buttons/BtnTypes";

const VARIANTS: BtnVariant[] = [
  "primary",
  "secondary",
  "brand",
  "info",
  "error",
  "success",
  "warning",
  "disabled",
];
const SIZES: BtnSize[] = ["xs", "sm", "md", "lg"];

const meta = {
  title: "UIElements/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: { label: "Badge", variant: "info", size: "md" },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    size: { control: "inline-radio", options: SIZES },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      {VARIANTS.map((variant) => (
        <Badge key={variant} {...args} variant={variant} label={variant} />
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      {SIZES.map((size) => (
        <Badge key={size} {...args} size={size} label={size} />
      ))}
    </div>
  ),
};
