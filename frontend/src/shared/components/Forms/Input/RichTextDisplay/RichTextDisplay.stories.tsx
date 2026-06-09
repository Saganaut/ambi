/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { RichTextDisplay } from "./RichTextDisplay";
import {
  richHtml,
  styledHtml,
  listHtml,
  linkHtml,
  longHtml,
} from "./RichTextDisplay.mocks";

const meta = {
  title: "Common/Input/RichTextDisplay",
  component: RichTextDisplay,
  tags: ["autodocs"],
  args: {
    value: richHtml,
    styled: true,
  },
  argTypes: {
    styled: { control: "boolean" },
    maxLength: { control: "number" },
  },
} satisfies Meta<typeof RichTextDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Preserves marks: bold / underline / strike plus inline color and font-size.
export const Styled: Story = {
  args: { value: styledHtml, styled: true },
};

// styled={false} drops every tag and renders plain text with block boundaries
// turned into newlines.
export const PlainText: Story = {
  args: { value: styledHtml, styled: false },
};

export const Lists: Story = {
  args: { value: listHtml },
};

export const WithLink: Story = {
  args: { value: linkHtml },
};

// Truncates to maxLength visible characters and appends an ellipsis.
export const Truncated: Story = {
  args: { value: longHtml, maxLength: 60 },
};
