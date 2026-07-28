// The badge decides its own shape from the content it is given: `Default` is
// the bare disc, everything below is the pill. Nothing here passes chrome —
// there is no prop for it.
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MarkerBadge } from "./MarkerBadge";

const meta = {
  title: "Common/MarkerBadge/MarkerBadge",
  component: MarkerBadge,
  tags: ["autodocs"],
  args: { displayIndex: 1, color: "oklch(0.65 0.19 25)" },
  argTypes: {
    color: { control: "color" },
  },
} satisfies Meta<typeof MarkerBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing but the number: a bare disc, no pill chrome. */
export const Default: Story = {};

export const Labeled: Story = {
  args: { label: "North gate" },
};

/** The badge caps its own label, so it truncates with no help from the caller. */
export const Truncating: Story = {
  args: { label: "A label far too long for the space it is given" },
};
