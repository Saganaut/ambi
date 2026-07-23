import { createFileRoute } from "@tanstack/react-router";
import { RegisterPage } from "@auth/views/RegisterPage/RegisterPage";
import { requirePreRegistration } from "@auth/guards";
import { RegisterSearch } from "@auth/hooks/useRegister";
import { toLocalReturnUrl } from "@utils/returnUrl";
import { AsyncBoundary } from "@ui/AsyncBoundary/AsyncBoundary";

export const Route = createFileRoute("/register")({
  // Identity is read from the PRE_REGISTRATION session (`/api/auth/me`), never
  // the URL — so the only search param is the post-register destination. It is
  // sanitized here at the door: `useRegister` feeds it to
  // `window.location.assign`, so an off-origin value must never survive.
  validateSearch: (search: Record<string, unknown>): RegisterSearch => ({
    returnUrl: toLocalReturnUrl(
      typeof search.returnUrl === "string" ? search.returnUrl : undefined,
    ),
  }),
  beforeLoad: ({ context, location }) => {
    requirePreRegistration(context.auth, location);
  },
  component: () => (
    <AsyncBoundary boundaryName='RegisterRoute'>
      <RegisterPage />
    </AsyncBoundary>
  ),
});
