// Pins the profile cache-sync rule: a successful updateMe folds its response
// into the `getMe` cache (creating the entry if nothing fetched it yet), so
// every avatar/display-name consumer re-renders with the new profile instead
// of serving the stale cached one.
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { emptySplitApi, apiBaseUrl } from "@/shared/store/emptyApi";
import { authPromptReducer } from "@/features/auth/store/authPromptSlice";
import { userApi, type UserProfileResponse } from "../userApi.gen";
import "./user";

const updatedProfile: UserProfileResponse = {
  publicId: "u1",
  username: "ringbearer",
  displayName: "Frodo",
  email: "frodo@shire.me",
  timezone: "UTC",
  userLevel: "USER",
  avatar: { internalAvatarId: "avatar-07" },
};

const server = setupServer(
  http.patch(`${apiBaseUrl}/api/users/me`, () =>
    HttpResponse.json(updatedProfile),
  ),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

const makeStore = () =>
  configureStore({
    reducer: {
      [emptySplitApi.reducerPath]: emptySplitApi.reducer,
      authPrompt: authPromptReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(emptySplitApi.middleware),
  });

describe("user profile cache sync", () => {
  it("folds the updateMe response into the getMe cache", async () => {
    const store = makeStore();

    const result = await store.dispatch(
      userApi.endpoints.updateMe.initiate({
        updateProfileRequest: { avatar: { internalAvatarId: "avatar-07" } },
      }),
    );
    expect(result.data).toEqual(updatedProfile);
    // The onQueryStarted continuation lands after the dispatch promise
    // resolves — flush a macrotask so the upsert has been dispatched.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const cached = userApi.endpoints.getMe.select()(store.getState());
    expect(cached.data).toEqual(updatedProfile);
  });
});
