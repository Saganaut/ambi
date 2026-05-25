import { createFileRoute } from "@tanstack/react-router";
import { TermsPage } from "../pages/TermsPage/TermsPage";

export const Route = createFileRoute("/terms-and-conditions")({
  component: TermsPage,
});
