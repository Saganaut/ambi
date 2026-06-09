/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */

import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { useState } from "react";
import { fn } from "storybook/test";
import { ColorPicker } from "./ColorPicker";

// ColorPicker is a controlled hue picker (value is a 0-360 angle). The stories
// wrap it in a stateful host so the selected swatch and the degree readout
// update as you click.
const meta = {
  title: "Common/Input/ColorPicker",
  component: ColorPicker,
  tags: ["autodocs"],
  args: {
    label: "Theme color",
    value: 200,
    onChange: fn(),
  },
  argTypes: {
    value: { control: { type: "range", min: 0, max: 360, step: 1 } },
    onChange: { control: false },
  },
  render: (args) => {
    const [hue, setHue] = useState(args.value);
    return <ColorPicker {...args} value={hue} onChange={setHue} />;
  },
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Red: Story = {
  args: { label: "Accent color", value: 0 },
};

export const Green: Story = {
  args: { label: "Accent color", value: 140 },
};
