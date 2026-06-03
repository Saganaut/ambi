import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { fn } from "storybook/test";
import { Modal } from "./Modal";

// Modal renders a native <dialog> via showModal() on mount and reads no
// Redux/RTK Query state, so no withStore decorator is needed. Each story
// renders the dialog open; onClose is wired with fn() so the close affordances
// are interactive in the Actions panel.
const VARIANTS = ["error", "success", "warning", "info", "brand"] as const;

const meta = {
  title: "Common/Modal/Modal",
  component: Modal,
  tags: ["autodocs"],
  args: {
    title: "Delete this deck?",
    onClose: fn(),
    children: "This action cannot be undone. The deck and its slides will be permanently removed.",
  },
  argTypes: {
    variant: { control: "inline-radio", options: [undefined, ...VARIANTS] },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Brand: Story = {
  args: { variant: "brand", title: "Welcome aboard" },
};

export const Error: Story = {
  args: { variant: "error", title: "Something went wrong" },
};

export const Success: Story = {
  args: { variant: "success", title: "Saved" },
};

export const Warning: Story = {
  args: { variant: "warning", title: "Unsaved changes" },
};

export const Info: Story = {
  args: { variant: "info", title: "Heads up" },
};

export const NoTitle: Story = {
  args: { title: undefined },
};
