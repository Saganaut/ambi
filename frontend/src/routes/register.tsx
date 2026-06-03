import { createFileRoute } from "@tanstack/react-router";
import { RegisterPage } from "@auth/views/RegisterPage/RegisterPage";
import { requirePreRegistration } from "@auth/guards";
import { RegisterSearch } from "@auth/hooks/useRegister";

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
