/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { fn } from "storybook/test";
import { TextArea } from "./TextArea";

const meta = {
  title: "Common/Input/TextArea",
  component: TextArea,
  tags: ["autodocs"],
  args: {
    label: "Description",
    placeholder: "Describe your deck…",
    id: "deck-description",
    rows: 4,
    onChange: fn(),
  },
  argTypes: {
    labelPosition: { control: "inline-radio", options: ["labelAbove", "labelInFront"] },
    variant: { control: "inline-radio", options: ["default"] },
  },
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithInfoMessage: Story = {
  args: { infoMessage: "Shown on the deck's detail page." },
};

// errorMessage replaces the info message and switches it to the error style.
export const WithError: Story = {
  args: { errorMessage: "Description is too long." },
};

export const LabelInFront: Story = {
  args: { labelPosition: "labelInFront" },
};

export const Disabled: Story = {
  args: { disabled: true, value: "A read-only description." },
};

export const Borderless: Story = {
  args: { isBordered: false, value: "Reads as plain text until focused." },
};

export const FullWidth: Story = {
  args: { fullWidth: true },
  render: (args) => (
    <div style={{ width: 480 }}>
      <TextArea {...args} />
    </div>
  ),
};
