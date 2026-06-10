/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { ColorSwatch } from "./ColorSwatch";
import { SAMPLE_SWATCH_COLORS } from "./ColorSwatch.mocks";

// ColorSwatch is a controlled grid of hex color chips. The stories wrap it in a
// stateful host so the active chip updates on click.
const meta = {
  title: "Common/Input/ColorSwatch",
  component: ColorSwatch,
  tags: ["autodocs"],
  args: {
    color: "#2b7fff",
    onChange: fn(),
  },
  argTypes: {
    color: { control: "color" },
    onChange: { control: false },
    colorChoices: { control: false },
  },
  render: (args) => {
    const [color, setColor] = useState(args.color);
    return <ColorSwatch {...args} color={color} onChange={setColor} />;
  },
} satisfies Meta<typeof ColorSwatch>;

export default meta;
type Story = StoryObj<typeof meta>;

// Uses the app's default COLOR_CHOICES palette.
export const Default: Story = {};

export const CustomChoices: Story = {
  args: { color: "#ff8904", colorChoices: SAMPLE_SWATCH_COLORS },
};
