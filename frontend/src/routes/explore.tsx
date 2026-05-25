// Route stub for the curated tag-driven discovery surface.
import { createFileRoute } from "@tanstack/react-router";
import { ExplorePage } from "../pages/ExplorePage/ExplorePage";

export const Route = createFileRoute("/explore")({
  component: ExplorePage,
});
