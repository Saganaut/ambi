import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CustomColorPicker } from "./CustomColorPicker";

// CustomColorPicker owns its working color internally (saturation square, hue
// slider, hex field) and only reports on the explicit Apply click, so the
// stories just seed a starting color and log the applied hex.
const meta = {
  title: "Common/Input/CustomColorPicker",
  component: CustomColorPicker,
  tags: ["autodocs"],
  args: {
    initialColor: "#7c5cff",
    onApply: fn(),
  },
  argTypes: {
    onApply: { control: false },
  },
} satisfies Meta<typeof CustomColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FromPaletteDefault: Story = {
  args: {
    // Options without an explicit color carry an oklch() palette default; the
    // picker recovers the hue and starts there.
    initialColor: "oklch(0.65 0.18 290)",
  },
};

export const FromThemeReference: Story = {
  args: {
    // A live var(--role-*) theme reference carries no recoverable hue, so the
    // picker starts from its neutral fallback.
    initialColor: "var(--role-primary)",
  },
};
