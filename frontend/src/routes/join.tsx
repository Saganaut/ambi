import { createFileRoute } from "@tanstack/react-router";
import { SessionJoinPage } from "@features/liveSession/views/SessionJoinPage/SessionJoinPage";
import { AsyncBoundary } from "@ui/AsyncBoundary/AsyncBoundary";

// Public player entry point. The lobby QR / share link points here as
// `/join?code=<roomCode>`; the code is read from the URL and prefilled into the
// join form. Deliberately not under `_authenticated` so the link opens for
// anyone; the page itself handles the sign-in requirement.
interface JoinSearch {
  code?: string;
}

export const Route = createFileRoute("/join")({
  validateSearch: (search: Record<string, unknown>): JoinSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  component: function JoinRoute() {
    const { code } = Route.useSearch();
    return (
      <AsyncBoundary boundaryName='SessionJoinRoute'>
        <SessionJoinPage code={code} />
      </AsyncBoundary>
    );
  },
});
