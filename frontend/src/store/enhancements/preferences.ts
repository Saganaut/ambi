/**
 * Cache-sync rules for the user's preferences — the home of the active theme
 * spec (`preferences.theme`), driven by useTheme.
 *
 * `getMe` (GET /api/users/me) is the single source of truth for the signed-in
 * user's preferences, so we tag it `Preferences`. `updatePreferences`
 * (PUT /api/users/me/preferences) is a wholesale replace, so it invalidates
 * that tag and RTK Query refetches the canonical profile. An optimistic
 * `onQueryStarted` patch splices the new preferences into the `getMe` cache so
 * every subscriber (theme toggle, settings form) reflects the change before the
 * round trip; the reconciling refetch then lands server truth. On reject we
 * undo the patch.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import { Ambi } from "../AmbiApi";

Ambi.enhanceEndpoints({
  addTagTypes: ["Preferences"],
  endpoints: {
    getMe: {
      providesTags: ["Preferences"],
    },
    updatePreferences: {
      invalidatesTags: ["Preferences"],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("getMe", undefined, (draft) => {
            draft.preferences = arg.updatePreferencesRequest;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
  },
});
