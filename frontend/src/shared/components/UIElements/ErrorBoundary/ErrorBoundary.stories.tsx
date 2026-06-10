/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

// The error fallback (ServerErrorPage) renders a TanStack Router <Link>, which
// needs a live router context to mount. Wrap each story in a throwaway
// in-memory router so the fallback renders standalone in Storybook.
const withRouter = (children: ReactNode) => {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        {children}
        <Outlet />
      </>
    ),
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  // The router instance is intentionally untyped against the app's route tree —
  // it only exists to satisfy <Link>'s context inside the story.
  return <RouterProvider router={router as never} />;
};

// A child that throws on render so the boundary's fallback path is exercised.
const ThrowingChild = (): ReactNode => {
  throw new Error("Storybook: simulated render crash");
};

const meta = {
  title: "Common/ErrorBoundary",
  component: ErrorBoundary,
  tags: ["autodocs"],
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

// Happy path: children render untouched when nothing throws.
export const HealthyChildren: Story = {
  // `children` is required by the component's props but the custom render below
  // supplies its own tree, so this is just here to satisfy the type.
  args: { children: null },
  render: () =>
    withRouter(
      <ErrorBoundary>
        <p>Everything is fine — the boundary passes children straight through.</p>
      </ErrorBoundary>,
    ),
};

// A child throws during render → the boundary catches it and shows the
// ServerErrorPage fallback instead of a blank screen.
export const CaughtError: Story = {
  args: { children: null },
  render: () =>
    withRouter(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    ),
};
