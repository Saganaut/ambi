import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { fn } from "storybook/test";
import { ColorOptionBtn } from "./ColorOptionBtn";
import { COLOR_PALETTE } from "./ColorOptionBtn.mocks";

const meta = {
  title: "Common/Buttons/ColorOptionBtn",
  component: ColorOptionBtn,
  tags: ["autodocs"],
  args: {
    label: "Red",
    color: "#e74c3c",
    onClick: fn(),
    preventFocusSteal: false,
  },
  argTypes: {
    color: { control: "color" },
    preventFocusSteal: { control: "boolean" },
  },
} satisfies Meta<typeof ColorOptionBtn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// An empty color renders a transparent swatch — used as the "default / clear" option.
export const Clear: Story = {
  args: { label: "Default", color: "" },
};

export const Palette: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      {COLOR_PALETTE.map((swatch) => (
        <ColorOptionBtn
          key={swatch.label}
          {...args}
          label={swatch.label}
          color={swatch.color}
        />
      ))}
    </div>
  ),
};
