import type { Meta, StoryObj } from "@storybook/react-vite";
import { ParetoChart } from "./ParetoChart";
import { SAMPLE_DATA } from "../charts.mocks";

const meta = {
  title: "Charts/ParetoChart",
  component: ParetoChart,
  tags: ["autodocs"],
  args: {
    data: SAMPLE_DATA,
    caption: "Votes (cumulative)",
  },
} satisfies Meta<typeof ParetoChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
