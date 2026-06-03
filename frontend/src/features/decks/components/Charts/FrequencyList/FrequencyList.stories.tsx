import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { FrequencyList } from "./FrequencyList";
import {
  EMPTY_SUBMISSIONS,
  OPEN_RESPONSES,
  QA_SUBMISSIONS,
} from "./FrequencyList.mocks";

const meta = {
  title: "Common/Charts/FrequencyList",
  component: FrequencyList,
  tags: ["autodocs"],
  args: {
    items: QA_SUBMISSIONS,
    caption: "Where was the One Ring destroyed?",
  },
} satisfies Meta<typeof FrequencyList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoCorrectAnswer: Story = {
  args: { items: OPEN_RESPONSES, caption: "Favorite hobbit meal" },
};

export const ExplicitTotal: Story = {
  args: {
    items: OPEN_RESPONSES,
    total: 50,
    caption: "Shares against an explicit total of 50",
  },
};

export const Empty: Story = {
  args: {
    items: EMPTY_SUBMISSIONS,
    caption: "No submissions yet",
    emptyMessage: "Waiting for the first answer…",
  },
};
