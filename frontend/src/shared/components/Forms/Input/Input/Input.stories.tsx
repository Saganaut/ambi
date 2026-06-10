/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./Input";

const meta = {
  title: "Common/Input/Input",
  component: Input,
  tags: ["autodocs"],
  args: {
    label: "Deck name",
    placeholder: "e.g. Lord of the Rings trivia",
    id: "deck-name",
  },
  argTypes: {
    labelPosition: { control: "inline-radio", options: ["labelAbove", "labelInFront"] },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithInfoMessage: Story = {
  args: { infoMessage: "Shown to players in the lobby." },
};

// errorMessage forces variant="error" and replaces the info message.
export const WithError: Story = {
  args: { errorMessage: "Name is required." },
};

export const LabelInFront: Story = {
  args: { labelPosition: "labelInFront" },
};

export const FullWidth: Story = {
  args: { fullWidth: true },
  render: (args) => (
    <div style={{ width: 480 }}>
      <Input {...args} />
    </div>
  ),
};
