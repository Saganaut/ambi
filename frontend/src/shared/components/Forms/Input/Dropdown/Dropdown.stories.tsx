import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { useState } from "react";
import { fn } from "storybook/test";
import { Dropdown } from "./Dropdown";
import { REGION_OPTIONS, CATEGORY_OPTIONS } from "./Dropdown.mocks";

// Dropdown is a controlled select (value is a string[] even in single mode).
// The stories wrap it in a stateful host so selecting / deselecting and chip
// removal actually update the displayed value.
const meta = {
  title: "Common/Input/Dropdown",
  component: Dropdown,
  tags: ["autodocs"],
  args: {
    label: "Region",
    options: REGION_OPTIONS,
    placeholder: "Select a region...",
    onChange: fn(),
  },
  argTypes: {
    labelPosition: {
      control: "inline-radio",
      options: ["labelAbove", "labelInFront"],
    },
    multiple: { control: "boolean" },
    searchable: { control: "boolean" },
    value: { control: false },
    onChange: { control: false },
  },
  render: (args) => {
    const [value, setValue] = useState<string[]>(args.value ?? []);
    return <Dropdown {...args} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSelection: Story = {
  args: { value: ["gondor"] },
};

export const Multiple: Story = {
  args: {
    label: "Categories",
    options: CATEGORY_OPTIONS,
    multiple: true,
    placeholder: "Select categories...",
    value: ["history", "science"],
  },
};

export const Searchable: Story = {
  args: {
    label: "Categories",
    options: CATEGORY_OPTIONS,
    searchable: true,
    multiple: true,
    placeholder: "Search categories...",
  },
};

export const WithInfoMessage: Story = {
  args: { infoMessage: "Where the trivia is set." },
};

// errorMessage forces the error styling and replaces the info message.
export const WithError: Story = {
  args: { errorMessage: "A region is required." },
};
