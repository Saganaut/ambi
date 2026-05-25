// Pathless layout route that gates all children behind a registered session.
// The leading underscore strips the segment from the URL — child routes keep
// their own paths (e.g. /account, /decks/, /my-favorites). The actual gate
// component lives in `@/components/Common/AuthenticatedLayout/` so this file
// can keep Fast Refresh on the gated subtree intact.
import { createFileRoute } from "@tanstack/react-router";
import { AuthenticatedLayout } from "../components/Common/AuthenticatedLayout/AuthenticatedLayout";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});
