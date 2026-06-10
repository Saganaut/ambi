/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { FileUpload } from "./FileUpload";

const meta = {
  title: "Common/Input/FileUpload",
  component: FileUpload,
  tags: ["autodocs"],
  args: {
    label: "Upload assets",
    onChange: fn(),
  },
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ImagesOnly: Story = {
  args: { label: "Cover image", accept: "image/*" },
};

export const WithInfoMessage: Story = {
  args: { infoMessage: "PNG or JPG, up to 5 MB each." },
};

// errorMessage forces the error styling and replaces the info message.
export const WithError: Story = {
  args: { errorMessage: "At least one file is required." },
};
