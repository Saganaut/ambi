import { createFileRoute } from "@tanstack/react-router";
import { type RegisterSearch } from "../components/Forms/RegistrationForm";
import { RegisterPage } from "../pages/RegisterPage/RegisterPage";

// const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>): RegisterSearch => {
    return {
      provider:
        typeof search.provider === "string" ? search.provider : undefined,
      providerId:
        typeof search.providerId === "string" ? search.providerId : undefined,
      email: typeof search.email === "string" ? search.email : undefined,
      name: typeof search.name === "string" ? search.name : undefined,
      picture: typeof search.picture === "string" ? search.picture : undefined,
      returnUrl:
        typeof search.returnUrl === "string" ? search.returnUrl : undefined,
    };
  },
  // beforeLoad: ({ search }) => {
  //   if (!search.providerId) {
  //     window.location.href = `${API_BASE}/api/auth/login`;
  //   }
  // },
  component: RegisterPage,
});
