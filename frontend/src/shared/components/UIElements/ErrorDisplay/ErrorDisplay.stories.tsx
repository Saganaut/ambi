/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import OceanFloor from "@assets/images/mascots/ocean-floor.svg?react";
import { ErrorDisplay } from "./ErrorDisplay";

const SIZES = ["sm", "md", "lg", "xl"] as const;

const meta = {
  title: "Common/ErrorDisplay",
  component: ErrorDisplay,
  tags: ["autodocs"],
  args: {
    statusCode: 404,
    title: "Page not found",
    message: "Looks like this corner of Ambi doesn't exist.",
    mascot: OceanFloor,
    size: "md",
  },
  argTypes: {
    size: { control: "inline-radio", options: SIZES },
  },
} satisfies Meta<typeof ErrorDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoActions: Story = {
  args: { actions: null },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
      {SIZES.map((size) => (
        <ErrorDisplay key={size} {...args} size={size} actions={null} />
      ))}
    </div>
  ),
};
