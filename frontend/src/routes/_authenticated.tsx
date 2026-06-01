// Pathless layout route that gates all children behind a registered session.
// The leading underscore strips the segment from the URL — child routes keep
// their own paths (e.g. /account, /decks/, /my-favorites).
//
// The redirect decision lives in `beforeLoad` (reading the typed `context.auth`
// fed in by AppRouter): preRegistration -> /register, anything else
// unregistered -> home with the login prompt. While `/api/auth/me` is still in
// flight `auth.state` is "loading" and the guard passes through; the
// AuthenticatedLayout component renders the loading frame, and AppRouter calls
// `router.invalidate()` when auth resolves so this guard re-runs with the real
// state. The gate component lives in `@/components/Common/AuthenticatedLayout/`
// so this file can keep Fast Refresh on the gated subtree intact.
import { createFileRoute } from "@tanstack/react-router";
import { AuthenticatedLayout } from "../components/Common/AuthenticatedLayout/AuthenticatedLayout";
import { requireRegistered } from "../auth/guards";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    requireRegistered(context.auth, location);
  },
  component: AuthenticatedLayout,
});
