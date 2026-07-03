/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { RichTextInput } from "./RichTextInput";
import { initialHtml, styledHtml, emptyHtml, blockHtml } from "./RichTextInput.mocks";

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

// The block variant fills its container vertically and exposes the list +
// heading toolbar. The fixed-height flex parent stands in for the slide canvas
// so the fill-height behaviour is visible in isolation; the seeded list shows
// markers following their item's text color.
export const Block: Story = {
  args: { value: blockHtml, variant: "block", label: "Slide content" },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return (
      <div style={{ display: "flex", width: 640, height: 400 }}>
        <RichTextInput {...args} value={value} onChange={setValue} />
      </div>
    );
  },
};
