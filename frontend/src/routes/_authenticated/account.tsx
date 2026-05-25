import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "../../pages/AccountPage/AccountPage";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
});
