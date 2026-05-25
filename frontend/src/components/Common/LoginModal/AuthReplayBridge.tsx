/**
 * Phase 4 of the auth-hardening plan — pairs with pendingMutationMiddleware.
 * When the user returns from the OAuth redirect (or otherwise transitions to
 * "registered" within the same tab), this component reads the pending
 * mutation that was captured at 401 time and prompts the user to resume it.
 * Confirming re-dispatches the original mutation via
 * BrainFlex.endpoints[name].initiate(args). Cancelling drops the entry — no
 * silent auto-retries, no surprise destructive actions.
 *
 * Mounted once near the root alongside AuthPromptBridge. Guarded by a ref so
 * a single pending entry only ever produces one prompt even if user-state
 * resolves multiple times during a single boot.
 */
import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useConfirm } from "@/components/Common/ConfirmDialog/useConfirm";
import { BrainFlex } from "@/store/BrainFlexApi";
import {
  clearPendingMutation,
  readPendingMutation,
} from "@/store/pendingMutationStore";
import type { AppDispatch } from "@/store/store";

// Treat the endpoints map as a string-indexed bag at this boundary: the
// endpointName we replay was captured at runtime from a rejected RTK Query
// action, so the type system can't narrow it back to a known key. Partial<>
// reflects the runtime reality — if the captured name no longer maps to an
// endpoint (renamed, removed between sessions) the lookup returns undefined.
interface ReplayableEndpoint {
  initiate: (args: unknown) => unknown;
}
const endpointBag = BrainFlex.endpoints as unknown as Partial<
  Record<string, ReplayableEndpoint>
>;

const AuthReplayBridge = () => {
  const userState = useCurrentUser();
  const dispatch = useDispatch<AppDispatch>();
  const confirm = useConfirm();
  const consumed = useRef(false);

  useEffect(() => {
    if (consumed.current) return;
    if (userState.state !== "registered") return;
    const pending = readPendingMutation();
    if (!pending) return;
    consumed.current = true;

    const endpoint = endpointBag[pending.endpointName];
    if (!endpoint) {
      clearPendingMutation();
      return;
    }

    void confirm({
      title: "Welcome back",
      message: `${pending.label}?`,
      confirmLabel: "Resume",
      cancelLabel: "Dismiss",
    }).then((ok) => {
      if (ok) {
        dispatch(
          endpoint.initiate(pending.originalArgs) as Parameters<AppDispatch>[0],
        );
      }
      clearPendingMutation();
    });
  }, [userState.state, dispatch, confirm]);

  return null;
};

export { AuthReplayBridge };
