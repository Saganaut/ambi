import { createFileRoute } from "@tanstack/react-router";
import { type RegisterSearch } from "../components/Forms/RegistrationForm";
import { RegisterPage } from "../pages/RegisterPage/RegisterPage";
import { requirePreRegistration } from "../auth/guards";

export const Route = createFileRoute("/register")({
  // Identity is read from the PRE_REGISTRATION session (`/api/auth/me`), never
  // the URL — so the only search param is the post-register destination.
  validateSearch: (search: Record<string, unknown>): RegisterSearch => ({
    returnUrl:
      typeof search.returnUrl === "string" ? search.returnUrl : undefined,
  }),
  beforeLoad: ({ context, location }) => {
    requirePreRegistration(context.auth, location);
  },
  component: RegisterPage,
});
