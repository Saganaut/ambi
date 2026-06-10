/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConfirmDialog } from "./ConfirmDialog";

// ConfirmDialog is the rendered dialog body — a controlled, presentational
// component. (The separate useConfirm() hook drives it imperatively and is not
// covered here.) It reads no Redux/RTK Query state, so no withStore decorator
// is needed.
const meta = {
  title: "Common/ConfirmDialog",
  component: ConfirmDialog,
  tags: ["autodocs"],
  args: {
    message: "Are you sure you want to continue?",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    variant: "default",
    onConfirm: fn(),
    onCancel: fn(),
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "danger"] },
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Danger: Story = {
  args: {
    variant: "danger",
    message: "This will permanently delete the deck. This cannot be undone.",
    confirmLabel: "Delete deck",
  },
};

export const CustomLabels: Story = {
  args: {
    message: "Discard your unsaved changes?",
    confirmLabel: "Discard",
    cancelLabel: "Keep editing",
  },
};
