import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "../../features/account/views/AccountPage/AccountPage";
import { AsyncBoundary } from "@ui/AsyncBoundary/AsyncBoundary";

export const Route = createFileRoute("/_authenticated/account")({
  component: () => (
    <AsyncBoundary boundaryName="account-route">
      <AccountPage />
    </AsyncBoundary>
  ),
});
