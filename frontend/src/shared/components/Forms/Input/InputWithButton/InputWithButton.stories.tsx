/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { fn } from "storybook/test";
import { InputWithButton } from "./InputWithButton";

const meta = {
  title: "Common/Input/InputWithButton",
  component: InputWithButton,
  tags: ["autodocs"],
  args: {
    label: "Join code",
    placeholder: "Enter session code",
    id: "join-code",
    buttonLabel: "Join",
    onChange: fn(),
    onButtonClick: fn(),
  },
  argTypes: {
    labelPosition: { control: "inline-radio", options: ["labelAbove", "labelInFront"] },
  },
} satisfies Meta<typeof InputWithButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithInfoMessage: Story = {
  args: { infoMessage: "Ask the host for the code." },
};

// errorMessage replaces the info message and switches it to the error style.
export const WithError: Story = {
  args: { errorMessage: "That code didn't match any session." },
};

export const LabelInFront: Story = {
  args: { labelPosition: "labelInFront" },
};

export const Disabled: Story = {
  args: { disabled: true, value: "ABC123" },
};
