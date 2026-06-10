/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { PlusIcon } from "@heroicons/react/24/outline";
import { ActionCard } from "./ActionCard";

// ActionCard is purely presentational — it takes its content via props and reads
// no Redux/RTK Query state — so no withStore decorator is needed. These stories
// exercise the button variant (onClick); the link variant (`to`) needs a
// TanStack Router context that the Storybook preview does not provide.
const meta = {
  title: "Common/Cards/ActionCard",
  component: ActionCard,
  tags: ["autodocs"],
  args: {
    icon: <PlusIcon style={{ width: "2rem", height: "2rem" }} />,
    title: "Create a deck",
    description: "Start from scratch and build your own question set.",
    onClick: fn(),
  },
} satisfies Meta<typeof ActionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithBadge: Story = {
  args: { badge: "New" },
};

export const Selected: Story = {
  args: { selected: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};
