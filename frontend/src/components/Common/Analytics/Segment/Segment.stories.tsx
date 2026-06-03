import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { fn } from "storybook/test";
import { Segment } from "./Segment";
import { mockItemsWithDisabled, mockRangeItems } from "./Segment.mocks";
import type { RangeId } from "./Segment.mocks";

// Segment is purely presentational/controlled — it takes items + value via props
// and calls onChange; it reads no Redux/RTK Query state — so no withStore
// decorator is needed here. The component is generic over the id type, so the
// stories pin it to the concrete RangeId union from the mocks.
const meta = {
  title: "Common/Analytics/Segment",
  component: Segment<RangeId>,
  tags: ["autodocs"],
  args: {
    items: mockRangeItems,
    value: "30d",
    ariaLabel: "Time range",
    onChange: fn(),
  },
  argTypes: {
    value: { control: "inline-radio", options: ["7d", "30d", "90d", "all"] },
  },
} satisfies Meta<typeof Segment<RangeId>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FirstSelected: Story = {
  args: { value: "7d" },
};

export const WithDisabledItem: Story = {
  args: { items: mockItemsWithDisabled, value: "all" },
};
