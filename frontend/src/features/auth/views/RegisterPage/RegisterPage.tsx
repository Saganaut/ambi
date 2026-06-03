import { getRouteApi } from "@tanstack/react-router";
import { useMeQuery } from "@store/AmbiApi";
import { RegistrationForm } from "@auth/components/RegistrationForm/RegistrationForm";
import { error } from "console";

const routeApi = getRouteApi("/register");

const RegisterPage = () => {
  const search = routeApi.useSearch();
  // The route's beforeLoad guarantees a PRE_REGISTRATION session here, so `/me`
  // carries the OAuth email for display prefill.
  const { data: me } = useMeQuery();

  if (me?.state === "VISITOR" || me?.state === "GUEST")
    throw error("Need to go through pre-registration");
  return (
    <div>
      <RegistrationForm
        registerSearchParams={search}
        email={me?.email ?? "Please enter your email"}
      />
    </div>
  );
};

export { RegisterPage };
