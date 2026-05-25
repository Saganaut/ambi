// Component rendered by the /_authenticated layout route. Gates everything
// underneath behind a registered session: while /api/auth/me is still in
// flight we render nothing, and as soon as the session resolves to anything
// other than "registered" we replace the current URL with "/" (the public
// landing page) plus the auth-prompt search params, so the landing page can
// open the LoginModal preserving the blocked path as `returnUrl`.
//
// Lives outside the route file so Fast Refresh keeps working — the route
// file exports a non-component (`Route`) and React Refresh requires a file
// to export only components for HMR to apply.
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const AuthenticatedLayout = () => {
  const userState = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (userState.state === "loading") return;
    if (userState.state === "registered") return;

    void navigate({
      to: "/",
      search: {
        authPrompt: true,
        returnUrl: location.href,
      },
      replace: true,
    });
  }, [userState.state, navigate, location.href]);

  if (userState.state !== "registered") return null;
  return <Outlet />;
};

export { AuthenticatedLayout };
