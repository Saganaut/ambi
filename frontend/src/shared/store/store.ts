import panelReducer from "@/features/deck/store/panelSlice.ts";
import { liveSessionReducer } from "@/features/liveSession/store/liveSessionSlice.ts";
import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { authPromptReducer } from "../../features/auth/store/authPromptSlice.ts";
import { emptySplitApi } from "./emptyApi";
// Side-effect import: layers cache-sync onQueryStarted handlers onto the
// auto-generated Ambi mutations so mutation responses update getDeck.
import "./apiEnhancements";

export const store = configureStore({
  reducer: {
    [emptySplitApi.reducerPath]: emptySplitApi.reducer,
    authPrompt: authPromptReducer,
    panel: panelReducer,
    liveSession: liveSessionReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(emptySplitApi.middleware),
});

// Enables the `refetchOnFocus` / `refetchOnReconnect` options RTK Query queries
// opt into (see imageRefreshPolicy). Without this the browser focus/online
// events are never wired to the store, so those flags are inert.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
