/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { RadioGroup } from "./RadioGroup";
import { difficultyOptions, visibilityOptions } from "./RadioGroup.mocks";

const meta = {
  title: "Common/Input/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
  args: {
    name: "difficulty",
    legend: "Difficulty",
    options: difficultyOptions,
    value: "medium",
    onChange: fn(),
  },
  argTypes: {
    options: { control: false },
  },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive: keeps the selection in local state so the control responds.
export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <RadioGroup {...args} value={value} onChange={setValue} />;
  },
};

export const WithInfoMessage: Story = {
  args: { infoMessage: "Affects scoring multipliers." },
};

export const WithError: Story = {
  args: { errorMessage: "Pick a difficulty to continue." },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Visibility: Story = {
  args: {
    name: "visibility",
    legend: "Who can see this deck?",
    options: visibilityOptions,
    value: "private",
  },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <RadioGroup {...args} value={value} onChange={setValue} />;
  },
};
