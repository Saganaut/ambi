/**
 * Mounted once near the root of the app. Watches the `authPrompt` Redux slice
 * (fed by the RTK Query base-query wrapper in `store/emptyApi.ts`) and opens
 * the shared LoginModal whenever a fresh 401 lands. Throttled so a burst of
 * 401s (e.g. several queries firing on the same page) only opens one modal —
 * the slice's monotonically increasing nonce makes each request distinguishable
 * even when the message text is identical, and a 500 ms guard collapses bursts.
 */
import { useRequireLogin } from "@/features/auth";
import { authPromptDismissed } from "@/features/auth/store/authPromptSlice";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import { useEffect, useRef } from "react";

const AuthPromptBridge = () => {
  const { openLoginModal, isAuthenticated } = useRequireLogin();
  const dispatch = useAppDispatch();
  const pending = useAppSelector((state) => state.authPrompt.pending);
  const lastHandledNonce = useRef(0);
  const lastOpenedAt = useRef(0);

  useEffect(() => {
    if (!pending) return;
    if (pending.nonce <= lastHandledNonce.current) return;
    lastHandledNonce.current = pending.nonce;
    dispatch(authPromptDismissed());
    if (isAuthenticated) return;
    const now = Date.now();
    if (now - lastOpenedAt.current < 500) return;
    lastOpenedAt.current = now;
    openLoginModal({ message: pending.message });
  }, [pending, isAuthenticated, openLoginModal, dispatch]);

  return null;
};

export { AuthPromptBridge };
