import { getRouteApi } from "@tanstack/react-router";
import { RegistrationForm } from "../../components/Forms/RegistrationForm";

const routeApi = getRouteApi("/register");

const RegisterPage = () => {
  const search = routeApi.useSearch();

  console.log("search", search);
  return (
    <div>
      <RegistrationForm registerSearchParams={search} />
    </div>
  );
};

export { RegisterPage };
