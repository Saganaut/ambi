// Owns the single live connection for a Gen-2 session and gates the page on it.
//
// SessionPage.tsx is a fixed layout template (never modified) that renders the
// session chrome unconditionally, so the connection can't live there. Instead
// the route wraps SessionPage in this provider, which:
//   1. opens the one STOMP subscription for the room (via
//      useInteractiveSessionWebSocket) — every topic dispatches into the
//      interactiveSession slice, which is the live source the page reads;
//   2. seeds that slice from the REST snapshot (so initial state — players,
//      status, the host's own viewerPlayerId — is present before any broadcast);
//   3. waits for that snapshot before rendering children, so useSession() always
//      has a real session to read (no half-loaded chrome);
//   4. exposes the host/player send actions through context so SessionControls
//      can publish without opening a second STOMP client.
import { useEffect, type ReactNode } from "react";
import { useGetInteractiveSessionQuery } from "@/store/AmbiApi";
import { useAppDispatch } from "@/store/hooks";
import { setSession } from "@/store/interactiveSessionSlice";
import { useInteractiveSessionWebSocket } from "@/hooks/useInteractiveSessionWebSocket";
import { Loader } from "@/components/Common/Loader/Loader";
import { SessionConnectionContext } from "./SessionConnectionContext";
import styles from "./SessionConnectionProvider.module.css";

interface SessionConnectionProviderProps {
  /** The room code — carried by the `$sessionId` route param. */
  roomCode: string;
  children: ReactNode;
}

const SessionConnectionProvider = ({
  roomCode,
  children,
}: SessionConnectionProviderProps) => {
  const dispatch = useAppDispatch();
  const connection = useInteractiveSessionWebSocket(roomCode);
  const { data, isError } = useGetInteractiveSessionQuery({ roomCode });

  // Seed the slice from the REST snapshot. The /lobby topic only broadcasts on
  // change, so without this the host's freshly-created session would sit empty
  // until someone joined.
  useEffect(() => {
    if (data) dispatch(setSession(data));
  }, [data, dispatch]);

  if (isError) {
    return (
      <div className={styles.state}>
        <p>That session could not be found.</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className={styles.state}>
        <Loader message='Loading session…' />
      </div>
    );
  }

  return (
    <SessionConnectionContext value={connection}>
      {children}
    </SessionConnectionContext>
  );
};

export { SessionConnectionProvider };
