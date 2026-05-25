// File-based route entry for /pricing. Per project convention, routes only
// wire the URL to a page component — all rendering lives in
// pages/PricingPage/PricingPage.tsx.
import { createFileRoute } from "@tanstack/react-router";
import { PricingPage } from "../pages/PricingPage/PricingPage";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});
