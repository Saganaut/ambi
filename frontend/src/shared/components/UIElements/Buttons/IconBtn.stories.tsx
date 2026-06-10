/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { PlusIcon, XMarkIcon, PencilIcon } from "@heroicons/react/24/outline";
import { IconBtn } from "./IconBtn";
import type { BtnVariant, BtnFill, BtnSize, BtnShape } from "./BtnTypes";

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
const FILLS: BtnFill[] = ["default", "bordered", "ghost"];
const SIZES: BtnSize[] = ["xs", "sm", "md", "lg"];
const SHAPES: BtnShape[] = ["default", "round", "pill", "avatar"];

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
    {children}
  </div>
);

const meta = {
  title: "Common/Buttons/IconBtn",
  component: IconBtn,
  tags: ["autodocs"],
  args: {
    icon: <PlusIcon style={{ width: "1em", height: "1em" }} />,
    "aria-label": "Add",
    onClick: fn(),
  },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    fill: { control: "inline-radio", options: FILLS },
    size: { control: "inline-radio", options: SIZES },
    shape: { control: "select", options: SHAPES },
    icon: { control: false },
  },
} satisfies Meta<typeof IconBtn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <Row>
      {VARIANTS.map((variant) => (
        <IconBtn key={variant} {...args} variant={variant} aria-label={variant} />
      ))}
    </Row>
  ),
};

export const Fills: Story = {
  render: (args) => (
    <Row>
      {FILLS.map((fill) => (
        <IconBtn key={fill} {...args} fill={fill} aria-label={fill} />
      ))}
    </Row>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <Row>
      {SIZES.map((size) => (
        <IconBtn key={size} {...args} size={size} aria-label={size} />
      ))}
    </Row>
  ),
};

// A close (X) button: ghost fill with an XMarkIcon, as documented in the source.
export const Close: Story = {
  args: {
    fill: "ghost",
    icon: <XMarkIcon style={{ width: "1em", height: "1em" }} />,
    "aria-label": "Close",
  },
};

export const Edit: Story = {
  args: {
    fill: "bordered",
    icon: <PencilIcon style={{ width: "1em", height: "1em" }} />,
    "aria-label": "Edit",
  },
};
