import type { Meta, StoryObj } from "@storybook/react-vite";
import { DotPlot } from "./DotPlot";
import { SAMPLE_DATA } from "../charts.mocks";

const meta = {
  title: "Charts/DotPlot",
  component: DotPlot,
  tags: ["autodocs"],
  args: {
    data: SAMPLE_DATA,
    caption: "Votes",
  },
} satisfies Meta<typeof DotPlot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
