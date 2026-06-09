/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { WordCloud } from "./WordCloud";
import { FAVORITE_PLACES, SENTIMENT_WORDS } from "./WordCloud.mocks";

const meta = {
  title: "Common/Charts/WordCloud",
  component: WordCloud,
  tags: ["autodocs"],
  args: {
    items: SENTIMENT_WORDS,
    caption: "Describe the trilogy in one word",
    animateOnMount: false,
  },
  argTypes: {
    animateOnMount: { control: "boolean" },
  },
} satisfies Meta<typeof WordCloud>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Animated: Story = {
  args: { animateOnMount: true },
};

export const WithHighlight: Story = {
  args: { items: FAVORITE_PLACES, caption: "Favorite place in Middle-earth" },
};
