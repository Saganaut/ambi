// Route stub for the achievement catalog — the page itself lives in
// `src/pages/AchievementsPage/`.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/achievements")({
  // TODO(migration): page not yet implemented (element→slide / liveSession migration)
  component: function AchievementsPage() {
    return <div>Achievements — under construction.</div>;
  },
});
