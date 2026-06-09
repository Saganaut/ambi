/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { useState } from "react";
import { fn } from "storybook/test";
import { NumberInput } from "./NumberInput";

// NumberInput is a controlled numeric field (value/onChange typed as number).
// The stories wrap it in a stateful host so typing/stepping updates the value.
const meta = {
  title: "Common/Input/NumberInput",
  component: NumberInput,
  tags: ["autodocs"],
  args: {
    label: "Round timer (seconds)",
    id: "round-timer",
    value: 30,
    min: 0,
    max: 300,
    step: 5,
    onChange: fn(),
  },
  argTypes: {
    labelPosition: {
      control: "inline-radio",
      options: ["labelAbove", "labelInFront"],
    },
    value: { control: false },
    onChange: { control: false },
  },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <NumberInput {...args} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof NumberInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LabelInFront: Story = {
  args: { labelPosition: "labelInFront" },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const WithInfoMessage: Story = {
  args: { infoMessage: "How long players have to answer." },
};

// errorMessage forces the error styling and replaces the info message.
export const WithError: Story = {
  args: { errorMessage: "Must be at least 5 seconds." },
};

export const FullWidth: Story = {
  args: { fullWidth: true },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return (
      <div style={{ width: 480 }}>
        <NumberInput {...args} value={value} onChange={setValue} />
      </div>
    );
  },
};
