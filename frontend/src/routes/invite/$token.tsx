/**
 * /invite/$token — public invite redemption endpoint. Calls the backend
 * redeem endpoint and either jumps the invitee straight to the lobby (when
 * the session has already booted) or shows a waiting card that polls.
 */
import { createFileRoute } from "@tanstack/react-router";

import { InvitePage } from "../../pages/InvitePage/InvitePage";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});
