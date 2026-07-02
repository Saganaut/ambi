/**
 * Cache-sync rules for the self-profile surface. The generated user/account
 * endpoints carry no tags, so — like the deck and gallery surfaces — each
 * profile mutation folds its own canonical response into the `getMe` cache
 * instead of invalidating + refetching:
 *
 *   • updateMe          → PATCH /api/users/me returns the full updated
 *                         UserProfileResponse; upsert it as the new `getMe`
 *                         truth so every consumer (account page, nav-bar
 *                         avatar) reflects an avatar / display-name change
 *                         immediately.
 *   • updatePreferences → PUT /api/users/me/preferences returns the same
 *                         response shape; identical fold.
 *
 * `getMe` takes no argument, so there is exactly one cache entry to reconcile;
 * `upsertQueryData` also materializes it when nothing has fetched the profile
 * yet, which keeps later mounts warm.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import {
  userApi,
  type UpdateMeApiArg,
  type UserProfileResponse,
} from "../userApi.gen";
import {
  accountApi,
  type UpdatePreferencesApiArg,
} from "../../../account/store/accountApi.gen";
import type { CacheSyncMutationApi } from "../../../../shared/store/enhancements/Enhancements.types";

/** Land the mutation's profile response as the new `getMe` cache truth. */
const upsertGetMe = (
  dispatch: (action: unknown) => unknown,
  profile: UserProfileResponse,
): void => {
  dispatch(userApi.util.upsertQueryData("getMe", undefined, profile));
};

userApi.enhanceEndpoints({
  endpoints: {
    updateMe: {
      onQueryStarted: async (
        _arg: UpdateMeApiArg,
        { dispatch, queryFulfilled }: CacheSyncMutationApi<UserProfileResponse>,
      ) => {
        try {
          const { data } = await queryFulfilled;
          upsertGetMe(dispatch, data);
        } catch {
          // Update failed — nothing optimistic to roll back.
        }
      },
    },
  },
});

accountApi.enhanceEndpoints({
  endpoints: {
    updatePreferences: {
      onQueryStarted: async (
        _arg: UpdatePreferencesApiArg,
        { dispatch, queryFulfilled }: CacheSyncMutationApi<UserProfileResponse>,
      ) => {
        try {
          const { data } = await queryFulfilled;
          upsertGetMe(dispatch, data);
        } catch {
          // Update failed — nothing optimistic to roll back.
        }
      },
    },
  },
});
