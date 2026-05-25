// Thin wrapper that feeds the current auth state into the router's typed
// context so any route's `beforeLoad` can read `context.auth` without calling
// `useCurrentUser` from inside a non-component scope. Lives in its own file
// (not inline in main.tsx) so Fast Refresh keeps working — the entry file
// can't export a component without breaking HMR.
import { RouterProvider } from "@tanstack/react-router";
import { useCurrentUser } from "./hooks/useCurrentUser";
import type { router } from "./main";

interface AppRouterProps {
  router: typeof router;
}

const AppRouter = ({ router }: AppRouterProps) => {
  const auth = useCurrentUser();
  return <RouterProvider router={router} context={{ auth }} />;
};

export { AppRouter };
