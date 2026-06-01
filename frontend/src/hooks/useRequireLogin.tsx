/**
 * Gate any action behind authentication. Returns a `requireLogin` helper that
 * either invokes the supplied callback (when the user is registered, or guest
 * if `allowGuest`) or pops the shared LoginModal via the ModalProvider.
 *
 * Also exposes `openLoginModal` so non-action paths (e.g. an RTK Query 401
 * interceptor — see `apiEnhancements.ts`) can surface the same prompt without
 * a wrapped callback.
 */
import { useCallback } from "react";
import { useModal } from "../context/useModal";
import { useCurrentUser } from "./useCurrentUser";
import { LoginModal } from "../components/Common/LoginModal/LoginModal";

interface OpenLoginModalOptions {
  message?: string;
  returnUrl?: string;
}

interface UseRequireLoginResult {
  isAuthenticated: boolean;
  openLoginModal: (options?: OpenLoginModalOptions) => void;
  requireLogin: <Args extends unknown[]>(
    action: (...args: Args) => void,
    options?: OpenLoginModalOptions,
  ) => (...args: Args) => void;
}

interface UseRequireLoginConfig {
  allowGuest?: boolean;
}

export function useRequireLogin(
  config: UseRequireLoginConfig = {},
): UseRequireLoginResult {
  const { allowGuest = false } = config;
  const { openModal } = useModal();
  const userState = useCurrentUser();

  const isAuthenticated =
    userState.state === "registered" ||
    (allowGuest && userState.state === "guest");

  const openLoginModal = useCallback(
    (options?: OpenLoginModalOptions) => {
      openModal({
        title: "Sign in",
        content: (
          <LoginModal
            message={options?.message}
            returnUrl={options?.returnUrl}
          />
        ),
      });
    },
    [openModal],
  );

  const requireLogin = useCallback(
    <Args extends unknown[]>(
      action: (...args: Args) => void,
      options?: OpenLoginModalOptions,
    ) => {
      return (...args: Args) => {
        if (isAuthenticated) {
          action(...args);
          return;
        }
        openLoginModal(options);
      };
    },
    [isAuthenticated, openLoginModal],
  );

  return { isAuthenticated, openLoginModal, requireLogin };
}
