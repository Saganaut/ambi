/**
 * Imperative auth actions — the action-model counterpart to {@link useCurrentUser}'s
 * read-model. Centralizes the OAuth login prompt, logout, and guest-session
 * creation so components don't reach for the raw RTK mutations or re-implement
 * the post-mutation reload.
 *
 * Registration is deliberately NOT here: it owns a multi-field form plus live
 * username-availability checking, so it keeps its own hook ({@link useRegister}).
 */
import { useCallback } from "react";
import { useCreateGuestMutation, useLogoutMutation } from "@auth/store/authApi.gen";
import { useRequireLogin } from "./useRequireLogin";

interface OpenLoginOptions {
  message?: string;
  returnUrl?: string;
}

export interface AuthActions {
  /**
   * Open the shared OAuth provider modal (LoginModal) via the ModalProvider.
   * Delegates to {@link useRequireLogin} so there's a single login entry point.
   */
  login: (options?: OpenLoginOptions) => void;
  /**
   * Revoke the server session, then hard-reload so every `/api/auth/me`-backed
   * cache refetches cold and the whole app drops to VISITOR. Goes through the
   * RTK mutation (not a raw fetch) so the base query attaches the X-XSRF-TOKEN
   * header — the backend 403s an unguarded `POST /api/auth/logout`. The reload
   * runs even if revocation errors, so a stale session can't linger client-side.
   */
  logout: () => Promise<void>;
  /**
   * Mint an ephemeral guest session (identity is server-minted — no chosen
   * name) and hard-reload so the session flips to GUEST. Rejects on failure
   * WITHOUT reloading, so the caller can surface its own field-level error.
   */
  createGuest: () => Promise<void>;
  /** True while the logout mutation is in flight. */
  isLoggingOut: boolean;
  /** True while the guest-creation mutation is in flight. */
  isCreatingGuest: boolean;
}

export function useAuthActions(): AuthActions {
  const { openLoginModal } = useRequireLogin();
  const [logoutMutation, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [createGuestMutation, { isLoading: isCreatingGuest }] =
    useCreateGuestMutation();

  const logout = useCallback(async () => {
    try {
      await logoutMutation().unwrap();
    } finally {
      window.location.reload();
    }
  }, [logoutMutation]);

  const createGuest = useCallback(async () => {
    // No try/finally here: on failure we deliberately stay put (no reload) so
    // the caller's catch can show an error. Reload only on success.
    await createGuestMutation().unwrap();
    window.location.reload();
  }, [createGuestMutation]);

  return {
    login: openLoginModal,
    logout,
    createGuest,
    isLoggingOut,
    isCreatingGuest,
  };
}
