import { createFileRoute } from "@tanstack/react-router";
import { LoginErrorPage } from "../pages/LoginErrorPage/LoginErrorPage";

export const Route = createFileRoute("/login-error")({
  component: LoginErrorPage,
});
