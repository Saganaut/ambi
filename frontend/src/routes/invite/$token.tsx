/**
 * /invite/$token — public invite redemption endpoint. Calls the backend
 * redeem endpoint and either jumps the invitee straight to the lobby (when
 * the session has already booted) or shows a waiting card that polls.
 */
import { createFileRoute } from "@tanstack/react-router";

// TODO(migration): page not yet implemented (element→slide / liveSession migration)
function InvitePage() {
  return <div>Invite — under construction.</div>;
}

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});
