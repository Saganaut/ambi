/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Toggle } from "./Toggle";

const meta = {
  title: "Common/Input/Toggle",
  component: Toggle,
  tags: ["autodocs"],
  args: {
    label: "Allow late joins",
    checked: true,
    onChange: fn(),
  },
  argTypes: {
    labelPosition: { control: "inline-radio", options: ["labelBefore", "labelAfter"] },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Off: Story = {
  args: { checked: false },
};

export const LabelBefore: Story = {
  args: { labelPosition: "labelBefore" },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const WithInfoMessage: Story = {
  args: { infoMessage: "Players can join after the game starts." },
};

export const WithError: Story = {
  args: { errorMessage: "This setting conflicts with timed mode." },
};
