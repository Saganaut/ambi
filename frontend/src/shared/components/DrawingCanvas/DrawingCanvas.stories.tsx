import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DrawingCanvas } from "./DrawingCanvas";

// DrawingCanvas is self-contained (local canvas state only, no Redux/RTK
// Query), so no withStore decorator is needed. Stories pin the width so the
// 1:1 surface doesn't fill the docs viewport.
const meta = {
  title: "Common/DrawingCanvas",
  component: DrawingCanvas,
  tags: ["autodocs"],
  args: {
    palette: ["#1A1A1A", "#E5484D", "#FFB224", "#30A46C", "#3E63DD", "#8E4EC6"],
    onEmptyChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: "min(70vh, 560px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DrawingCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithShapes: Story = {
  args: { allowShapes: true },
};

export const PenOnly: Story = {
  args: { palette: [], allowEraser: false },
};

export const TraceableBackground: Story = {
  args: {
    allowShapes: true,
    backgroundImageUrl: "https://picsum.photos/seed/trace-me/800/800",
  },
};

export const ReadOnly: Story = {
  args: { disabled: true },
};
