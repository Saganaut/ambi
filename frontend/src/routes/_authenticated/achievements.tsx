// Route stub for the achievement catalog — the page itself lives in
// `src/pages/AchievementsPage/`.
import { createFileRoute } from "@tanstack/react-router";
import { AchievementsPage } from "../../pages/AchievementsPage/AchievementsPage";

export const Route = createFileRoute("/_authenticated/achievements")({
  component: AchievementsPage,
});
