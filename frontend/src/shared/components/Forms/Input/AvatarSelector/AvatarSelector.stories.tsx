import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { useState } from "react";
import { fn } from "storybook/test";
import { AvatarSelector } from "./AvatarSelector";
import { SAMPLE_AVATARS, MANY_AVATARS } from "./AvatarSelector.mocks";

// AvatarSelector is a controlled radio-group picker. The stories wrap it in a
// small stateful host so the selected tile actually updates on click.
const meta = {
  title: "Common/Input/AvatarSelector",
  component: AvatarSelector,
  tags: ["autodocs"],
  args: {
    legend: "Choose your avatar",
    options: SAMPLE_AVATARS,
    value: "ember",
    onChange: fn(),
  },
  argTypes: {
    value: { control: false },
    onChange: { control: false },
    maxVisible: { control: { type: "number" } },
  },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <AvatarSelector {...args} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof AvatarSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// More options than maxVisible (6) shows the expand/collapse chevron.
export const Overflowing: Story = {
  args: { options: MANY_AVATARS, value: "moss" },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const WithInfoMessage: Story = {
  args: { infoMessage: "Pick the face other players will see." },
};

export const WithError: Story = {
  args: { errorMessage: "Please choose an avatar." },
};
