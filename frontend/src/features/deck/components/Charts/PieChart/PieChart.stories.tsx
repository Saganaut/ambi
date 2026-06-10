/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PieChart } from "./PieChart";
import { EMPTY_DATA, FIVE_SLICES, VOTE_SHARES } from "./PieChart.mocks";

const meta = {
  title: "Common/Charts/PieChart",
  component: PieChart,
  tags: ["autodocs"],
  args: {
    items: VOTE_SHARES,
    caption: "Who should lead the Fellowship?",
    animateOnMount: false,
  },
  argTypes: {
    animateOnMount: { control: "boolean" },
  },
} satisfies Meta<typeof PieChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Animated: Story = {
  args: { animateOnMount: true },
};

export const FivePalette: Story = {
  args: { items: FIVE_SLICES, caption: "Elemental allocation" },
};

export const Empty: Story = {
  args: { items: EMPTY_DATA, caption: "No responses yet" },
};
