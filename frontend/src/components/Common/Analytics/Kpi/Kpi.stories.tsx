import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { UsersIcon } from "@heroicons/react/24/outline";
import { Kpi } from "./Kpi";
import type { KpiSize, KpiTrend } from "./Kpi";

const SIZES: KpiSize[] = ["sm", "md", "lg"];
const TRENDS: KpiTrend[] = ["up", "down", "flat"];

// Kpi is purely presentational — it takes label/value/trend via props and reads
// no Redux/RTK Query state — so no withStore decorator is needed here.
const meta = {
  title: "Common/Analytics/Kpi",
  component: Kpi,
  tags: ["autodocs"],
  args: {
    label: "Total plays",
    value: "1,284",
    size: "md",
  },
  argTypes: {
    size: { control: "inline-radio", options: SIZES },
    trend: { control: "inline-radio", options: TRENDS },
  },
} satisfies Meta<typeof Kpi>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TrendUp: Story = {
  args: { label: "Active players", value: "342", trend: "up", delta: "+12%" },
};

export const TrendDown: Story = {
  args: { label: "Avg. score", value: "68%", trend: "down", delta: "-4%" },
};

export const WithSubAndIcon: Story = {
  args: {
    label: "Unique participants",
    value: "5,902",
    sub: "Last 30 days",
    icon: <UsersIcon width={18} height={18} aria-hidden="true" />,
  },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
      {SIZES.map((size) => (
        <Kpi key={size} {...args} size={size} label={size} />
      ))}
    </div>
  ),
};
