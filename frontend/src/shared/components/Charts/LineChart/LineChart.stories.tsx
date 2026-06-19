import type { Meta, StoryObj } from "@storybook/react-vite";
import { LineChart } from "./LineChart";
import { SAMPLE_DATA } from "../charts.mocks";

const meta = {
  title: "Charts/LineChart",
  component: LineChart,
  tags: ["autodocs"],
  args: {
    chartMode: "scorable",
    data: SAMPLE_DATA,
    caption: "Votes",
  },
} satisfies Meta<typeof LineChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
