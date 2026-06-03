import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { Kpi } from "@/components/Common/Analytics/Kpi/Kpi";
import { KpiStrip } from "./KpiStrip";

const DENSITIES = ["compact", "comfortable"] as const;

// KpiStrip is a purely presentational layout wrapper — it takes children via
// props and reads no Redux/RTK Query state — so no withStore decorator is
// needed here. The default tiles are composed inline from <Kpi> so the strip's
// auto-fit grid behaviour is visible.
const meta = {
  title: "Common/Analytics/KpiStrip",
  component: KpiStrip,
  tags: ["autodocs"],
  args: {
    density: "comfortable",
    children: (
      <>
        <Kpi label="Total plays" value="1,284" trend="up" delta="+12%" />
        <Kpi label="Active players" value="342" sub="Last 30 days" />
        <Kpi label="Avg. score" value="68%" trend="down" delta="-4%" />
        <Kpi label="Completion rate" value="74%" trend="flat" delta="0%" />
      </>
    ),
  },
  argTypes: {
    density: { control: "inline-radio", options: DENSITIES },
  },
} satisfies Meta<typeof KpiStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Comfortable: Story = {};

export const Compact: Story = {
  args: { density: "compact" },
};
