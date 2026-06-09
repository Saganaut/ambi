/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";

import { SlideThumbnailContent } from "./SlideThumbnailContent";
import { satisfies } from "storybook/internal/common";
import { SLIDE_TYPE_LIST } from "@deck/store/deckEnums.gen";

const meta = {
  title: "DeckEditor/SlideThumbnailContent",
  component: SlideThumbnailContent,
  tags: ["autodocs"],
  args: { slideType: "MCQ", title: "MCQ Slide" },
  argTypes: {
    slideType: {
      control: "select",
      options: SLIDE_TYPE_LIST,
    },
  },
} satisfies Meta<typeof SlideThumbnailContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initial: Story = {};

export const ThumbnailTypes: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      {SLIDE_TYPE_LIST.map((type) => (
        <SlideThumbnailContent {...args} slideType={type} />
      ))}
    </div>
  ),
};
