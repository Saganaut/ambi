import type { Meta, StoryObj } from "@storybook/react-vite";
import { BarChart } from "./BarChart";
import { SAMPLE_DATA } from "../charts.mocks";

const meta = {
  title: "Charts/BarChart",
  component: BarChart,
  tags: ["autodocs"],
  args: {
    data: SAMPLE_DATA,
    orientation: "horizontal",
    caption: "Votes",
  },
  argTypes: {
    orientation: { control: "inline-radio", options: ["horizontal", "vertical"] },
  },
} satisfies Meta<typeof BarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {};

export const Vertical: Story = {
  args: { orientation: "vertical" },
};
