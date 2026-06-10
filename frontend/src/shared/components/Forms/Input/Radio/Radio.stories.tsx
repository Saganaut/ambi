/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Radio } from "./Radio";

const meta = {
  title: "Common/Input/Radio",
  component: Radio,
  tags: ["autodocs"],
  args: {
    name: "example",
    value: "option-1",
    label: "Option one",
    checked: true,
    onChange: fn(),
  },
  argTypes: {
    labelPosition: { control: "inline-radio", options: ["labelBefore", "labelAfter"] },
  },
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Unchecked: Story = {
  args: { checked: false },
};

export const LabelBefore: Story = {
  args: { labelPosition: "labelBefore" },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const WithInfoMessage: Story = {
  args: { infoMessage: "Recommended for new players." },
};

export const WithError: Story = {
  args: { checked: false, errorMessage: "Selection required." },
};
