/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { useState } from "react";
import { CollapseBtn } from "./CollapseBtn";

// CollapseBtn is a controlled toggle: it takes the current `isCollapsed` flag
// and a `collapse` state setter. The stories wrap it in a tiny stateful host so
// the chevron actually rotates when clicked.
const meta = {
  title: "Common/Buttons/CollapseBtn",
  component: CollapseBtn,
  tags: ["autodocs"],
  // `collapse` is supplied by the stateful render wrapper below; this no-op
  // satisfies the required prop on the args type.
  args: {
    isCollapsed: false,
    collapse: () => undefined,
  },
  argTypes: {
    isCollapsed: { control: "boolean" },
    collapse: { control: false },
  },
  render: (args) => {
    const [isCollapsed, setIsCollapsed] = useState(args.isCollapsed);
    return <CollapseBtn isCollapsed={isCollapsed} collapse={setIsCollapsed} />;
  },
} satisfies Meta<typeof CollapseBtn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {
  args: { isCollapsed: false },
};

export const Collapsed: Story = {
  args: { isCollapsed: true },
};
