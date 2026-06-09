/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { fn } from "storybook/test";
import { Alert } from "./Alert";
import type { AlertSeverity } from "./Alert";

const SEVERITIES: AlertSeverity[] = ["info", "success", "warning", "error"];

const meta = {
  title: "Common/Alert",
  component: Alert,
  tags: ["autodocs"],
  args: {
    severity: "info",
    title: "Heads up",
    children: "This is an inline status message.",
  },
  argTypes: {
    severity: { control: "inline-radio", options: SEVERITIES },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Severities: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {SEVERITIES.map((severity) => (
        <Alert key={severity} {...args} severity={severity} title={severity}>
          {`A ${severity} alert.`}
        </Alert>
      ))}
    </div>
  ),
};

export const Dismissible: Story = {
  args: { severity: "warning", title: "Unsaved changes", onDismiss: fn() },
};

export const Compact: Story = {
  args: { compact: true, severity: "success", title: undefined, children: "Saved." },
};
