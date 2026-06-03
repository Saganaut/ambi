// Component rendered by the /_authenticated layout route. The redirect decision
// now lives in the route's `beforeLoad` (see routes/_authenticated.tsx) — this
// component only owns the loading frame: while `/api/auth/me` is still in flight
// `beforeLoad` can't decide yet, so it passes through and we render nothing here
// until AppRouter's `router.invalidate()` re-runs the guard against the resolved
// session. Once that happens, an unregistered session has already been
// redirected away by `beforeLoad`, so reaching render means "registered".
//
// Lives outside the route file so Fast Refresh keeps working — the route file
// exports a non-component (`Route`) and React Refresh requires a file to export
// only components for HMR to apply.
import { useCurrentUser } from "@/features/auth";
import { Outlet } from "@tanstack/react-router";

const AuthenticatedLayout = () => {
  const userState = useCurrentUser();

  if (userState.state === "loading") return null;
  return <Outlet />;
};

export { AuthenticatedLayout };
