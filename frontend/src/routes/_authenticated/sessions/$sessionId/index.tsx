import { SessionPage } from "@features/liveSession/views/SessionPage/SessionPage";
import { SessionConnectionProvider } from "@features/liveSession/views/SessionPage/SessionConnectionProvider";
import { createFileRoute } from "@tanstack/react-router";

// The `$sessionId` route param carries the session's room code (the join code),
// which is what the REST + STOMP APIs key on. The provider owns the single live
// connection and gates the page until the session has loaded.
export const Route = createFileRoute("/_authenticated/sessions/$sessionId/")({
  component: function SessionRoute() {
    const { sessionId } = Route.useParams();
    return (
      <SessionConnectionProvider roomCode={sessionId}>
        <SessionPage />
      </SessionConnectionProvider>
    );
  },
});
