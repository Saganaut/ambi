import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { DistributionList } from "./DistributionList";
import { mockAverageRows, mockCountRows } from "./DistributionList.mocks";

// DistributionList is purely presentational — it takes rows via props and reads
// no Redux/RTK Query state — so no withStore decorator is needed here.
const meta = {
  title: "Common/Analytics/DistributionList",
  component: DistributionList,
  tags: ["autodocs"],
  args: {
    rows: mockCountRows,
  },
} satisfies Meta<typeof DistributionList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithCaption: Story = {
  args: {
    caption: "Most-picked answers",
    rows: mockCountRows,
  },
};

export const Averages: Story = {
  args: {
    caption: "Average rating per prompt",
    rows: mockAverageRows,
  },
};

export const Empty: Story = {
  args: {
    rows: [],
    caption: "Most-picked answers",
  },
};

export const EmptyWithCustomMessage: Story = {
  args: {
    rows: [],
    emptyMessage: "No distribution available for this session yet.",
  },
};
