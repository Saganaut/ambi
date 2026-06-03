import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { fn } from "storybook/test";
import { Checkbox } from "./Checkbox";

const meta = {
  title: "Common/Input/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  args: {
    label: "Allow guests to join",
    id: "allow-guests",
    onChange: fn(),
  },
  argTypes: {
    labelPosition: {
      control: "inline-radio",
      options: ["labelBefore", "labelAfter"],
    },
    checked: { control: "boolean" },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = {
  args: { checked: true },
};

export const LabelBefore: Story = {
  args: { labelPosition: "labelBefore", checked: true },
};

export const Disabled: Story = {
  args: { disabled: true, checked: true },
};

export const WithInfoMessage: Story = {
  args: { infoMessage: "Guests can play without an account." },
};

// errorMessage forces the error styling and replaces the info message.
export const WithError: Story = {
  args: { errorMessage: "You must accept the rules." },
};
