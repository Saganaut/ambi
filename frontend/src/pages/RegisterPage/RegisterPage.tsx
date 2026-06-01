import { getRouteApi } from "@tanstack/react-router";
import { RegistrationForm } from "../../components/Forms/RegistrationForm";
import { useMeQuery } from "../../store/AmbiApi";

const routeApi = getRouteApi("/register");

const RegisterPage = () => {
  const search = routeApi.useSearch();
  // The route's beforeLoad guarantees a PRE_REGISTRATION session here, so `/me`
  // carries the OAuth email for display prefill.
  const { data: me } = useMeQuery();

  return (
    <div>
      <RegistrationForm registerSearchParams={search} email={me?.email} />
    </div>
  );
};

export { RegisterPage };
