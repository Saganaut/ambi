import { getRouteApi } from "@tanstack/react-router";
import { useMeQuery } from "@auth/store/authApi.gen";
import { RegistrationForm } from "@auth/components/RegistrationForm/RegistrationForm";

const routeApi = getRouteApi("/register");

const RegisterPage = () => {
  const search = routeApi.useSearch();
  // The route's beforeLoad guarantees a PRE_REGISTRATION session here, so `/me`
  // carries the OAuth email for display prefill.
  const { data: me } = useMeQuery();

  if (me?.state === "VISITOR" || me?.state === "GUEST")
    throw new Error("Need to go through pre-registration");
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
