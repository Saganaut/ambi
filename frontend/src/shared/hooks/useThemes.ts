// Theme-collection layer over the generated theme API. Reads the built-in
// presets (available to everyone) and the caller's personal themes, and exposes
// intent-level create / update / delete handlers that mint ids and shape the
// request bodies. Cache behaviour (optimistic patch + response reconcile) lives
// in `store/enhancements/theme.ts`, so it applies no matter who calls a
// mutation — these handlers stay thin.
//
// `listMyThemes` is auth-gated, so it is skipped for anyone not registered
// (mirrors `useTheme`): a 401 there would trip the login-prompt funnel, and a
// guest has no personal themes to show anyway.
import { useCreateThemeMutation, useDeleteThemeMutation, useListBuiltInThemesQuery, useListMyThemesQuery, useUpdateThemeMutation, type ThemeResponse, type ThemeSpec } from "@features/theme/store/themeApi.gen";
import { useCurrentUser } from "@auth/hooks/useCurrentUser";

export interface CreateThemeInput {
  name: string;
  spec: ThemeSpec;
  /** Owning org id, or omitted/blank for a personal theme. */
  organizationId?: string;
}

export interface UpdateThemeInput {
  name: string;
  spec: ThemeSpec;
}

export function useThemes() {
  const userState = useCurrentUser();
  const isRegistered = userState.state === "registered";

  const { data: builtInThemes = [], isLoading: loadingBuiltIn } =
    useListBuiltInThemesQuery();
  const { data: myThemes = [], isLoading: loadingMine } = useListMyThemesQuery(
    undefined,
    { skip: !isRegistered },
  );
  const [createThemeMutation, { isLoading: isCreating }] =
    useCreateThemeMutation();
  const [updateThemeMutation, { isLoading: isUpdating }] =
    useUpdateThemeMutation();
  const [deleteThemeMutation, { isLoading: isDeleting }] =
    useDeleteThemeMutation();

  // Optimistic create: the client mints the theme's UUID (PUT /api/themes/{id}),
  // matching how decks and slides are created.
  const createTheme = (input: CreateThemeInput): Promise<ThemeResponse> =>
    createThemeMutation({
      id: crypto.randomUUID(),
      createThemeRequest: {
        name: input.name,
        spec: input.spec,
        organizationId: input.organizationId,
      },
    }).unwrap();

  const updateTheme = (
    id: string,
    patch: UpdateThemeInput,
  ): Promise<ThemeResponse> =>
    updateThemeMutation({ id, updateThemeRequest: patch }).unwrap();

  const deleteTheme = (id: string): Promise<unknown> =>
    deleteThemeMutation({ id }).unwrap();

  return {
    builtInThemes,
    myThemes,
    isLoading: loadingBuiltIn || loadingMine,
    createTheme,
    updateTheme,
    deleteTheme,
    isSaving: isCreating || isUpdating,
    isDeleting,
  };
}
