/**
 * Cache-sync rules for theme mutations. The generated theme endpoints carry no
 * tags, so — like the deck surface — each mutation keeps the relevant list cache
 * in sync from its own response instead of invalidating + refetching.
 *
 *   • createTheme  → upsert the returned theme into `listMyThemes` (personal) or
 *                    the matching `listThemesForOrg` (org-owned).
 *   • updateTheme  → optimistically patch `getTheme` + `listMyThemes`, then
 *                    reconcile both from the canonical response.
 *   • deleteTheme  → splice the theme out of `listMyThemes` (and any cached
 *                    `listThemesForOrg`), rolled back on reject.
 *
 * Built-in presets are platform-curated (admin-only writes), so the
 * `listBuiltInThemes` cache is left untouched here.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */

import { themeApi } from "../themeApi.gen";

import type {
  CacheSyncApi,
  CacheSyncMutationApi,
} from "@shared/store/enhancements/types";
import {
  ThemeResponse,
  UpdateThemeApiArg,
  DeleteThemeApiArg,
  ListThemesForOrgApiArg,
} from "../themeApi.gen";

/** Insert-or-replace a theme in a `ThemeResponse[]` draft, matched by id. */
const upsert = (draft: ThemeResponse[], theme: ThemeResponse) => {
  const i = draft.findIndex((t) => t.id === theme.id);
  if (i >= 0) draft[i] = theme;
  else draft.push(theme);
};

/** Route a created/updated theme into the right list cache by ownership. */
const writeThemeIntoLists = (
  dispatch: (action: unknown) => unknown,
  theme: ThemeResponse,
) => {
  if (theme.ownership?.type === "ORGANIZATION" && theme.organizationId) {
    dispatch(
      themeApi.util.updateQueryData(
        "listThemesForOrg",
        { orgId: theme.organizationId },
        (draft) => {
          upsert(draft, theme);
        },
      ),
    );
    return;
  }
  dispatch(
    themeApi.util.updateQueryData("listMyThemes", undefined, (draft) => {
      upsert(draft, theme);
    }),
  );
};

themeApi.enhanceEndpoints({
  endpoints: {
    createTheme: {
      onQueryStarted: async (
        _arg: unknown,
        { dispatch, queryFulfilled }: CacheSyncMutationApi<ThemeResponse>,
      ) => {
        try {
          const { data } = await queryFulfilled;
          writeThemeIntoLists(dispatch, data);
        } catch {
          // Create failed — nothing optimistic to roll back.
        }
      },
    },
    updateTheme: {
      onQueryStarted: async (
        arg: UpdateThemeApiArg,
        { dispatch, queryFulfilled }: CacheSyncMutationApi<ThemeResponse>,
      ) => {
        const getPatch = dispatch(
          themeApi.util.updateQueryData("getTheme", { id: arg.id }, (draft) => {
            Object.assign(draft, arg.updateThemeRequest);
          }),
        );
        const listPatch = dispatch(
          themeApi.util.updateQueryData("listMyThemes", undefined, (draft) => {
            const hit = draft.find((t) => t.id === arg.id);
            if (hit) Object.assign(hit, arg.updateThemeRequest);
          }),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            themeApi.util.updateQueryData(
              "getTheme",
              { id: arg.id },
              () => data,
            ),
          );
          writeThemeIntoLists(dispatch, data);
        } catch {
          getPatch.undo();
          listPatch.undo();
        }
      },
    },
    deleteTheme: {
      onQueryStarted: async (arg: DeleteThemeApiArg, api: CacheSyncApi) => {
        const patches: { undo: () => void }[] = [];
        const patch = (action: unknown) => {
          patches.push(api.dispatch(action) as { undo: () => void });
        };

        patch(
          themeApi.util.updateQueryData("listMyThemes", undefined, (draft) =>
            draft.filter((t) => t.id !== arg.id),
          ),
        );

        // Splice from any cached org-theme lists too — we don't know the owning
        // org id here, so sweep every materialized listThemesForOrg query.
        const queries = api.getState().api?.queries ?? {};
        for (const entry of Object.values(queries)) {
          if (entry?.endpointName !== "listThemesForOrg") continue;
          const queryArg = (entry.originalArgs ?? {}) as ListThemesForOrgApiArg;
          patch(
            themeApi.util.updateQueryData(
              "listThemesForOrg",
              queryArg,
              (draft) => draft.filter((t) => t.id !== arg.id),
            ),
          );
        }

        try {
          await api.queryFulfilled;
        } catch {
          for (const p of patches) p.undo();
        }
      },
    },
  },
});
