/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn, userEvent, within } from "storybook/test";
import { Input } from "../Input/Input";
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

// compact pairs with labelInFront for label-left settings rows: the trigger
// hugs its content as a bordered field and the panel right-aligns under it.
export const Compact: Story = {
  args: {
    labelPosition: "labelInFront",
    compact: true,
    value: ["gondor"],
  },
};

export const WithInfoMessage: Story = {
  args: { infoMessage: "Where the trivia is set." },
};

// errorMessage forces the error styling and replaces the info message.
export const WithError: Story = {
  args: { errorMessage: "A region is required." },
};

export const Disabled: Story = {
  args: { disabled: true, value: ["gondor"] },
};

// Side-by-side field states make native-input and button-backed select chrome
// directly comparable in every Storybook appearance.
export const FieldParityMatrix: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "1rem",
        maxWidth: "48rem",
      }}>
      <Input label='Default input' placeholder='Enter a region...' />
      <Dropdown label='Default dropdown' options={REGION_OPTIONS} />
      <Input
        label='Invalid input'
        defaultValue='Unknown'
        errorMessage='Choose a known region.'
      />
      <Dropdown
        label='Invalid dropdown'
        options={REGION_OPTIONS}
        errorMessage='Choose a known region.'
      />
      <Input label='Disabled input' defaultValue='Gondor' disabled />
      <Dropdown
        label='Disabled dropdown'
        options={REGION_OPTIONS}
        value={["gondor"]}
        disabled
      />
    </div>
  ),
};

export const FocusedInputParity: Story = {
  render: () => (
    <div style={{ maxWidth: "24rem" }}>
      <Input label='Focused input' />
      <Dropdown label='Resting dropdown' options={REGION_OPTIONS} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("textbox", { name: "Focused input" }),
    );
  },
};

export const OpenDropdownParity: Story = {
  render: () => (
    <div style={{ maxWidth: "24rem" }}>
      <Input label='Resting input' />
      <Dropdown label='Open dropdown' options={REGION_OPTIONS} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", {
      name: "Open dropdown",
    });
    await userEvent.click(trigger);
    await userEvent.hover(trigger);
  },
};

export const BorderlessOnRaisedSurface: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gap: "1rem",
        maxWidth: "24rem",
        padding: "1rem",
        background: "var(--bg-surface-raised)",
      }}>
      <Input label='Borderless input' isBordered={false} />
      <Dropdown
        label='Borderless dropdown'
        options={REGION_OPTIONS}
        isBordered={false}
      />
    </div>
  ),
};
