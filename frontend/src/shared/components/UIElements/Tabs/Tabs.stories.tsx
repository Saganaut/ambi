/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { Tabs } from "./Tabs";
import { sampleTabs } from "./Tabs.mocks";

const meta = {
  title: "Common/Tabs/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  args: {
    items: sampleTabs,
    value: sampleTabs[0].id,
    onChange: fn(),
    variant: "underline",
    ariaLabel: "Deck sections",
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["underline", "pill"] },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

// Controlled: keep active tab in local state so selection works in the UI.
const ControlledTabs = (args: React.ComponentProps<typeof Tabs>) => {
  const [value, setValue] = useState(args.value);
  return (
    <Tabs
      {...args}
      value={value}
      onChange={(id) => {
        args.onChange(id);
        setValue(id);
      }}
    />
  );
};

export const Underline: Story = {
  render: (args) => <ControlledTabs {...args} />,
};

export const Pill: Story = {
  args: { variant: "pill" },
  render: (args) => <ControlledTabs {...args} />,
};
