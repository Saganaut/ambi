/**
 * /scheduled — host's list of upcoming and past scheduled InteractiveSessions.
 * Authenticated only; the listMyScheduledSessions endpoint requires ROLE_USER.
 */
import { createFileRoute } from "@tanstack/react-router";

import { ScheduledSessionsPage } from "../../pages/ScheduledSessionsPage/ScheduledSessionsPage";

export const Route = createFileRoute("/_authenticated/scheduled")({
  component: ScheduledSessionsPage,
});
