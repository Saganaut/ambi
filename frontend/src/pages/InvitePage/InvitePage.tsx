/**
 * /invite/$token — redeems an invite token and routes the invitee into the
 * lobby.
 *
 * Flow:
 *   1. POST /api/invites/{token}/redeem on mount.
 *   2. If response.roomCode → navigate to /games/{roomCode}/lobby.
 *   3. If response.roomCode is null → the parent ScheduledInteractiveSession
 *      hasn't booted yet. Render a waiting card and re-attempt every 30s.
 *
 * The endpoint is public — guest sessions are fine. If the user wants to
 * register/sign in first, they hit /login with `returnUrl=/invite/{token}`
 * via the link in the card.
 */
import { useEffect, useState } from "react";
import { getRouteApi, useNavigate, Link } from "@tanstack/react-router";
import { Btn } from "@/components/Common/Buttons/Btn";
import { useRedeemInviteMutation } from "@/store/BrainFlexApi";

const routeApi = getRouteApi("/invite/$token");

const POLL_INTERVAL_MS = 30_000;

const InvitePage = () => {
  const { token } = routeApi.useParams();
  const navigate = useNavigate();
  const [redeem, { data, isLoading, error }] = useRedeemInviteMutation();
  const [pollCount, setPollCount] = useState(0);

  // Kick off the first redeem on mount, and again whenever pollCount ticks.
  useEffect(() => {
    void redeem({ token }).unwrap().catch(() => null);
  }, [token, pollCount, redeem]);

  // When we know the live session is up, jump into the session immediately.
  useEffect(() => {
    if (data?.roomCode) {
      void navigate({
        to: "/sessions/$sessionId",
        params: { sessionId: data.roomCode },
        replace: true,
      });
    }
  }, [data?.roomCode, navigate]);

  // Pre-boot waiting room: silently re-poll every 30s.
  useEffect(() => {
    if (data && !data.roomCode) {
      const id = setTimeout(() => {
        setPollCount((c) => c + 1);
      }, POLL_INTERVAL_MS);
      return () => {
        clearTimeout(id);
      };
    }
    return undefined;
  }, [data]);

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: "var(--space-6) auto", padding: "var(--space-4)" }}>
        <h1>That invite isn't valid.</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          The link may have expired or already been used.
        </p>
        <Link to='/'>
          <Btn size='md' shape='pill'>Go home</Btn>
        </Link>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div style={{ maxWidth: 480, margin: "var(--space-6) auto", padding: "var(--space-4)" }}>
        <p>Looking up your invite…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "var(--space-6) auto", padding: "var(--space-4)" }}>
      <h1>{data.deckName ?? "A session"} hasn't started yet</h1>
      <p style={{ color: "var(--text-secondary)" }}>
        {data.hostName ?? "Your host"} scheduled this for{" "}
        {data.scheduledStartAt
          ? new Date(data.scheduledStartAt).toLocaleString()
          : "soon"}
        . We'll redirect you to the lobby as soon as it opens.
      </p>
    </div>
  );
};

export { InvitePage };
