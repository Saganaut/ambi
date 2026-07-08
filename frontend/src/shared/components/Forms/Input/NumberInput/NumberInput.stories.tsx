/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
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
    size: {
      control: "inline-radio",
      options: ["sm", "md", "lg"],
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

// The three sizes flip the field's manifest vars (padding, font, stepper width).
export const Sizes: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <NumberInput
            {...args}
            key={size}
            id={`${args.id}-${size}`}
            label={`Round timer (${size})`}
            size={size}
            value={value}
            onChange={setValue}
          />
        ))}
      </div>
    );
  },
};

// compact pairs with labelInFront for label-left settings rows: the field hugs
// the right edge at a fixed narrow width with centred, tabular numerals.
export const Compact: Story = {
  args: { labelPosition: "labelInFront", compact: true },
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
