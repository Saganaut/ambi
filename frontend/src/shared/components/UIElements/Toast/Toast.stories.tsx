/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { fn } from "storybook/test";
import { Toast, ToastContainer } from "./Toast";
import { TOAST_VARIANTS, sampleToasts } from "./Toast.mocks";

const meta = {
  title: "Common/Toast/Toast",
  component: Toast,
  tags: ["autodocs"],
  args: {
    id: "toast-1",
    message: "Deck saved.",
    variant: "success",
    // 0 = persistent, so the story doesn't auto-dismiss while you inspect it.
    duration: 0,
    onDismiss: fn(),
  },
  argTypes: {
    variant: { control: "inline-radio", options: TOAST_VARIANTS },
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <ToastContainer>
      {sampleToasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={args.onDismiss} />
      ))}
    </ToastContainer>
  ),
};
