import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { Divider } from "./Divider";

// Divider is purely presentational — it emits a single styled separator element
// and reads no Redux/RTK Query state — so no withStore decorator is needed.
const meta = {
  title: "Common/Divider",
  component: Divider,
  tags: ["autodocs"],
  args: {
    orientation: "horizontal",
    inset: false,
  },
  argTypes: {
    orientation: { control: "inline-radio", options: ["horizontal", "vertical"] },
  },
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: (args) => (
    <div style={{ width: "20rem" }}>
      <p style={{ margin: "0 0 0.75rem" }}>Above the divider.</p>
      <Divider {...args} />
      <p style={{ margin: "0.75rem 0 0" }}>Below the divider.</p>
    </div>
  ),
};

export const Inset: Story = {
  args: { inset: true },
  render: Horizontal.render,
};

export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <div style={{ display: "flex", alignItems: "center", height: "4rem", gap: "0.75rem" }}>
      <span>Left</span>
      <Divider {...args} />
      <span>Right</span>
    </div>
  ),
};
