//TODO:  Is this deprecated?

// Redux slice that brokers "this request came back 401, please sign in" between
// the RTK Query base-query wrapper (`emptyApi.ts`) and the React tree
// (`AuthPromptBridge`). The base query dispatches `authPromptRequested` from
// inside its 401 branch — using `api.dispatch` makes Redux the wire instead of
// a hand-rolled event bus. A monotonically increasing `nonce` lets the bridge
// detect every fresh request even when consecutive 401s carry the same
// message, and lets the bridge throttle by comparing nonces.
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface AuthPromptState {
  /** Set whenever a fresh 401 comes in. `null` while no prompt is pending. */
  pending: { message?: string; nonce: number } | null;
  /** Monotonic counter so each dispatch produces a distinct `pending` value
   *  even if the message is unchanged. */
  nonce: number;
}

const initialState: AuthPromptState = {
  pending: null,
  nonce: 0,
};

const authPromptSlice = createSlice({
  name: "authPrompt",
  initialState,
  reducers: {
    authPromptRequested: (
      state,
      action: PayloadAction<{ message?: string }>,
    ) => {
      state.nonce += 1;
      state.pending = { message: action.payload.message, nonce: state.nonce };
    },
    authPromptDismissed: (state) => {
      state.pending = null;
    },
  },
});

export const { authPromptRequested, authPromptDismissed } =
  authPromptSlice.actions;
export const authPromptReducer = authPromptSlice.reducer;
