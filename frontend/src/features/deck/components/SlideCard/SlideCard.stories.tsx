import type { Meta, StoryObj } from "@storybook/react-vite";

import { SlideCard } from "./SlideCard";
import { SLIDE_TYPE_LIST } from "@deck/store/deckEnums.gen";

const meta = {
  title: "DeckEditor/SlideCard",
  component: SlideCard,
  tags: ["autodocs"],
  args: { slideType: "MCQ", title: "Which planet is largest?", index: 1 },
  argTypes: {
    slideType: {
      control: "select",
      options: SLIDE_TYPE_LIST,
    },
  },
} satisfies Meta<typeof SlideCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initial: Story = {};

export const Active: Story = { args: { active: true } };

export const FollowUpSize: Story = {
  args: { size: "sm", index: "1a", slideType: "FOLLOW_UP" },
};

export const AllTypes: Story = {
  render: (args) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        width: 300,
      }}
    >
      {SLIDE_TYPE_LIST.map((type) => (
        <SlideCard key={type} {...args} slideType={type} />
      ))}
    </div>
  ),
};
