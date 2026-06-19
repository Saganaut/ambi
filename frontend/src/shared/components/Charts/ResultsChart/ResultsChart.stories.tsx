import type { Meta, StoryObj } from "@storybook/react-vite";
import { ResultsChart } from "./ResultsChart";
import { ALL_CHART_TYPES, SAMPLE_DATA } from "../charts.mocks";

const meta = {
  title: "Charts/ResultsChart",
  component: ResultsChart,
  tags: ["autodocs"],
  args: {
    viz: "BAR_HORIZONTAL",
    data: SAMPLE_DATA,
    caption: "Sample data",
  },
  argTypes: {
    viz: { control: "select", options: ALL_CHART_TYPES },
  },
} satisfies Meta<typeof ResultsChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Every chart kind the dispatcher knows, side by side, on the same data — the
// "same data, many views" the results feature is built around.
export const AllKinds: Story = {
  render: (args) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "1.5rem",
      }}>
      {ALL_CHART_TYPES.map((viz) => (
        <div key={viz}>
          <h4 style={{ margin: "0 0 0.5rem" }}>{viz}</h4>
          <ResultsChart {...args} viz={viz} caption={undefined} />
        </div>
      ))}
    </div>
  ),
};
