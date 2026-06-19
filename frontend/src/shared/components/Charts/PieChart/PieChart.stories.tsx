import type { Meta, StoryObj } from "@storybook/react-vite";
import { PieChart } from "./PieChart";
import { SAMPLE_DATA } from "../charts.mocks";

const meta = {
  title: "Charts/PieChart",
  component: PieChart,
  tags: ["autodocs"],
  args: {
    data: SAMPLE_DATA,
    variant: "pie",
    animateOnMount: false,
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["pie", "donut"] },
  },
} satisfies Meta<typeof PieChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pie: Story = {};

export const Donut: Story = {
  args: { variant: "donut" },
};
