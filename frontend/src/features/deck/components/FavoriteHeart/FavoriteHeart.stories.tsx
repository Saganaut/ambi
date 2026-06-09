/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { FavoriteHeart } from "./FavoriteHeart";

const SIZES = ["sm", "md"] as const;

const meta = {
  title: "Decks/FavoriteHeart",
  component: FavoriteHeart,
  tags: ["autodocs"],
  args: {
    deckId: "deck-1",
    isFavorited: false,
    size: "md",
    showCount: false,
    disabled: false,
  },
  argTypes: {
    size: { control: "inline-radio", options: SIZES },
  },
} satisfies Meta<typeof FavoriteHeart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotFavorited: Story = {};

export const Favorited: Story = {
  args: { isFavorited: true },
};

export const WithCount: Story = {
  args: { isFavorited: true, showCount: true, favoriteCount: 42 },
};

export const Small: Story = {
  args: { size: "sm", isFavorited: true },
};

export const Disabled: Story = {
  args: { disabled: true, isFavorited: true },
};
