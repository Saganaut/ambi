// Returns the current user's organizations, gated to registered users.
// Visitors and guests never see org-shared content, so the underlying
// useListMyOrgsQuery is skipped for them — callers can use the returned
// list unconditionally and trust that it's empty for unauthenticated users.
// RTK Query caches the result, so multiple consumers share one request.
import { useListMyOrgsQuery } from "@/store/AmbiApi";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export const useCurrentUserOrgs = () => {
  const userState = useCurrentUser();
  return useListMyOrgsQuery(undefined, {
    skip: userState.state !== "registered",
  });
};
