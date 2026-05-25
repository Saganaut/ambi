import { createFileRoute } from "@tanstack/react-router";
import { DesignSystemPage } from "../pages/DesignSystemPage/DesignSystemPage";

export const Route = createFileRoute("/design-system")({
  component: DesignSystemPage,
});
