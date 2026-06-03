import type { Meta, StoryObj } from "@storybook/tanstack-react";
import type { BtnSize } from "../BtnTypes";
import { DeckActionButton } from "./DeckActionButton";

// DeckActionButton is currently presentational — the start/customize handlers
// are console.log placeholders and it reads no Redux/RTK Query state, so no
// withStore decorator is needed. It only takes a deckId plus optional
// size/label, and renders a split "Play" button with a Customize… menu.
const SIZES: BtnSize[] = ["xs", "sm", "md", "lg"];

const meta = {
  title: "Common/Buttons/DeckActionButton",
  component: DeckActionButton,
  tags: ["autodocs"],
  args: {
    deckId: "deck-1",
    size: "sm",
    label: "Play",
  },
  argTypes: {
    size: { control: "inline-radio", options: SIZES },
  },
} satisfies Meta<typeof DeckActionButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Large: Story = {
  args: { size: "lg" },
};

export const CustomLabel: Story = {
  args: { label: "Start" },
};
