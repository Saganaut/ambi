import type { Meta, StoryObj } from "@storybook/react-vite";
import { MarkerBadge } from "./MarkerBadge";

const meta = {
  title: "Common/MarkerBadge/MarkerBadge",
  component: MarkerBadge,
  tags: ["autodocs"],
  args: { displayIndex: 1, color: "oklch(0.65 0.19 25)" },
  argTypes: {
    color: { control: "color" },
  },
} satisfies Meta<typeof MarkerBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Labeled: Story = {
  args: { label: "North gate" },
};

export const WithThumbnail: Story = {
  args: { label: "North gate", imageSrc: "https://picsum.photos/seed/marker/80/80" },
};

export const Truncating: Story = {
  render: (args) => (
    <div style={{ maxWidth: "9rem" }}>
      <MarkerBadge {...args} label="A label far too long for the space it is given" />
    </div>
  ),
};
