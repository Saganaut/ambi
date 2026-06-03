/**
 * /scheduled — host's list of upcoming and past scheduled InteractiveSessions.
 * Authenticated only; the listMyScheduledSessions endpoint requires ROLE_USER.
 */
import { createFileRoute } from "@tanstack/react-router";

// TODO(migration): page not yet implemented (element→slide / liveSession migration)
function ScheduledSessionsPage() {
  return <div>Scheduled sessions — under construction.</div>;
}

export const Route = createFileRoute("/_authenticated/scheduled")({
  component: ScheduledSessionsPage,
});
