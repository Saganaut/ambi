/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { BtnVariant, BtnSize } from "../Buttons/Btn.types";
import { Card } from "./Card";

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

// Card is purely presentational — it renders header/body/footer slots and reads
// no Redux/RTK Query state — so no withStore decorator is needed.
const meta = {
  title: "Common/Cards/Card",
  component: Card,
  tags: ["autodocs"],
  args: {
    header: <strong>Card header</strong>,
    body: "The card body holds the primary content for this slot.",
    footer: <small>Card footer</small>,
    size: "md",
  },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    size: { control: "inline-radio", options: SIZES },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Primary: Story = {
  args: { variant: "primary" },
};

export const Clickable: Story = {
  args: { variant: "secondary", onClick: fn() },
};

export const NoFooter: Story = {
  args: { footer: undefined },
};
