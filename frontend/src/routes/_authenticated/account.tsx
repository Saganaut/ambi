import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "../../features/account/views/AccountPage/AccountPage";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
});
