import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { useState } from "react";
import { fn } from "storybook/test";
import { RichTextInput } from "./RichTextInput";
import { initialHtml, styledHtml, emptyHtml } from "./RichTextInput.mocks";

const meta = {
  title: "Common/Input/RichTextInput",
  component: RichTextInput,
  tags: ["autodocs"],
  args: {
    value: initialHtml,
    label: "Slide body",
    id: "slide-body",
    placeholder: "Type something…",
    isBordered: true,
    onChange: fn(),
  },
  argTypes: {
    isBordered: { control: "boolean" },
    onChange: { control: false },
    onBlur: { control: false },
    ref: { control: false },
  },
} satisfies Meta<typeof RichTextInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// Controlled: TipTap emits an HTML string on every edit; the story holds it in
// local state so typing and formatting persist.
export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return (
      <div style={{ width: 480 }}>
        <RichTextInput {...args} value={value} onChange={setValue} />
      </div>
    );
  },
};

export const Empty: Story = {
  args: { value: emptyHtml, placeholder: "Start typing…" },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return (
      <div style={{ width: 480 }}>
        <RichTextInput {...args} value={value} onChange={setValue} />
      </div>
    );
  },
};

export const Borderless: Story = {
  args: { value: styledHtml, isBordered: false },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return (
      <div style={{ width: 480 }}>
        <RichTextInput {...args} value={value} onChange={setValue} />
      </div>
    );
  },
};
