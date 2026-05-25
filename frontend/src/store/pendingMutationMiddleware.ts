/**
 * Captures the args of an RTK Query mutation that failed with 401, so a
 * post-login AuthReplayBridge can offer to re-run it. Sits in front of
 * emptySplitApi.middleware in the store; reads action.meta.arg.originalArgs
 * (which is what was passed to endpoints.X.initiate(args)) and stashes a
 * single entry in sessionStorage via pendingMutationStore.
 *
 * Only endpoints listed in MUTATION_LABELS are captured. The explicit allowlist
 * keeps us from accidentally capturing file uploads (originalArgs contains a
 * File reference that won't survive a page reload) or any future mutation
 * whose replay would be confusing without product-thought first.
 */
import type { Middleware } from "@reduxjs/toolkit";
import { setPendingMutation } from "./pendingMutationStore";

const MUTATION_LABELS: Record<string, string> = {
  createDeck: "Create your deck",
  updateDeck: "Save your deck changes",
  deleteDeck: "Delete the deck",
  addElement: "Add the slide",
  updateElement: "Save the slide changes",
  deleteElement: "Delete the slide",
  moveElement: "Reorder the slides",
  createInteractiveSession: "Start the interactiveSession",
  cancelInteractiveSession: "Cancel the interactiveSession",
  joinByRoomCode: "Join the interactiveSession",
  createTheme: "Create the theme",
  updateTheme: "Save the theme",
  deleteTheme: "Delete the theme",
  createOrg: "Create the organization",
  joinOrg: "Join the organization",
  leaveOrg: "Leave the organization",
  closeAccount: "Close your account",
  updateProfile: "Save profile changes",
};

interface RejectedMutationAction {
  type: string;
  payload?: { status?: number | string };
  meta?: {
    arg?: {
      type?: string;
      endpointName?: string;
      originalArgs?: unknown;
    };
  };
}

const isRejectedMutationAction = (action: unknown): action is RejectedMutationAction => {
  if (typeof action !== "object" || action === null) return false;
  const a = action as RejectedMutationAction;
  return (
    typeof a.type === "string" &&
    a.type.endsWith("/rejected") &&
    a.meta?.arg?.type === "mutation"
  );
};

export const pendingMutationMiddleware: Middleware = () => (next) => (action) => {
  if (isRejectedMutationAction(action)) {
    const status = action.payload?.status;
    const endpointName = action.meta?.arg?.endpointName;
    const originalArgs = action.meta?.arg?.originalArgs;
    if (status === 401 && endpointName && endpointName in MUTATION_LABELS) {
      try {
        // Reject early if the args are non-serialisable (FormData, File). We
        // would otherwise stash a useless reference that JSON.stringify drops.
        JSON.stringify(originalArgs);
        setPendingMutation({
          endpointName,
          originalArgs,
          label: MUTATION_LABELS[endpointName],
          capturedAt: Date.now(),
        });
      } catch {
        // Non-serialisable args — skip capture rather than store garbage.
      }
    }
  }
  return next(action);
};
