import { SessionConnectionProvider } from "@features/liveSession/views/SessionPage/SessionConnectionProvider";
import { SessionPage } from "@features/liveSession/views/SessionPage/SessionPage";
import { createFileRoute } from "@tanstack/react-router";
import { AsyncBoundary } from "@ui/AsyncBoundary/AsyncBoundary";

// The `$sessionId` route param carries the session id — the key the REST snapshot
// keys on (create/join return it). The provider fetches the snapshot, seeds the
// live store, owns the single STOMP connection, and gates the page until loaded.
export const Route = createFileRoute("/_authenticated/sessions/$sessionId/")({
  component: function SessionRoute() {
    const { sessionId } = Route.useParams();
    return (
      <AsyncBoundary boundaryName='SessionRoute'>
        <SessionConnectionProvider sessionId={sessionId}>
          <SessionPage />
        </SessionConnectionProvider>
      </AsyncBoundary>
    );
  },
});
