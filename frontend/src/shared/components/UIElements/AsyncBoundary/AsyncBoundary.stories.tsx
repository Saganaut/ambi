/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { AsyncBoundary } from "./AsyncBoundary";

// A child that throws on render so the boundary's error fallback is exercised.
const ThrowingChild = (): ReactNode => {
  throw new Error("Storybook: simulated render crash");
};

// A promise that never resolves, so Suspense stays on its fallback forever —
// enough to demonstrate the loading state in a static story.
const NEVER_SETTLES = new Promise<never>(() => undefined);
const SuspendingChild = (): ReactNode => {
  throw NEVER_SETTLES;
};

const meta = {
  title: "Common/AsyncBoundary",
  component: AsyncBoundary,
  tags: ["autodocs"],
} satisfies Meta<typeof AsyncBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

// Happy path: children render untouched when nothing throws or suspends.
export const HealthyChildren: Story = {
  args: {
    children: <p>Everything is fine — the boundary passes children through.</p>,
  },
};

// Suspense fallback shows while the child is pending.
export const Loading: Story = {
  args: { children: <SuspendingChild /> },
};

// Error fallback shows once the child throws during render.
export const CaughtError: Story = {
  args: { children: <ThrowingChild /> },
};
