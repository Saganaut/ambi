// Shared theme-picker behavior used by the AccountPage section and the deck
// editor's RightSidebar panel: lists themes, activates a preset or custom
// theme, opens the editor in the shared modal, and reflects the user's orgs
// in the editor's scope dropdown.
import {
  useDeleteThemeMutation,
  useGetCurrentUserQuery,
  useListThemesQuery,
  useUpdateProfileMutation,
} from "../store/BrainFlexApi";
import type { ThemeResponse } from "../store/BrainFlexApi";
import { useTheme } from "./useTheme";
import { apiToUiMode } from "../utils/themeMode";
import { useCurrentUser } from "./useCurrentUser";
import { useCurrentUserOrgs } from "./useCurrentUserOrgs";
import { useModal } from "../context/useModal";
import {
  ThemeEditor,
  type OrgOption,
} from "../pages/AccountPage/ThemeEditor";
import { themePresets, type ThemePreset } from "../pages/DesignSystemPage/data";

interface UseThemePickerResult {
  isLoading: boolean;
  presets: ThemePreset[];
  themes: ThemeResponse[];
  activeThemeId: string | undefined;
  customPresetActive: boolean;
  organizations: OrgOption[];
  userId: string | undefined;
  activatePreset: (preset: ThemePreset) => Promise<void>;
  activateCustom: (theme: ThemeResponse) => Promise<void>;
  deleteCustom: (theme: ThemeResponse) => Promise<void>;
  openEditor: (existing?: ThemeResponse) => void;
}

export function useThemePicker(): UseThemePickerResult {
  const userState = useCurrentUser();
  const registeredUser =
    userState.state === "registered" ? userState.user : null;

  const { refetch: refetchUser } = useGetCurrentUserQuery();
  const { data: themes = [], refetch: refetchThemes } = useListThemesQuery(
    undefined,
    { skip: !registeredUser },
  );
  const { data: myOrgs = [] } = useCurrentUserOrgs();

  const [updateProfile] = useUpdateProfileMutation();
  const [deleteTheme] = useDeleteThemeMutation();

  const {
    setTheme: applyMode,
    setHuePrimary,
    setHueAccent,
    resetHues,
    customTheme,
  } = useTheme();

  const { openModal, closeModal } = useModal();

  const activeThemeId = registeredUser?.activeThemeId;
  const organizations: OrgOption[] = myOrgs
    .filter((o): o is { id: string; name: string } & typeof o => !!o.id && !!o.name)
    .map((o) => ({ id: o.id, name: o.name }));

  const activatePreset = async (preset: ThemePreset) => {
    if (preset.label === "Brand") {
      resetHues();
    } else {
      setHuePrimary(preset.huePrimary);
      setHueAccent(preset.hueAccent);
    }
    await updateProfile({
      updateProfileRequest: { activeThemeId: "" },
    }).unwrap();
    await refetchUser();
  };

  const activateCustom = async (theme: ThemeResponse) => {
    if (!theme.id) return;
    setHuePrimary(theme.huePrimary ?? 260);
    setHueAccent(theme.hueAccent ?? 25);
    const uiMode = apiToUiMode(theme.mode);
    if (uiMode === "light" || uiMode === "dark") {
      applyMode(uiMode);
    }
    await updateProfile({
      updateProfileRequest: { activeThemeId: theme.id },
    }).unwrap();
    await refetchUser();
  };

  const deleteCustom = async (theme: ThemeResponse) => {
    if (!theme.id) return;
    await deleteTheme({ id: theme.id }).unwrap();
    if (activeThemeId === theme.id) {
      await updateProfile({
        updateProfileRequest: { activeThemeId: "" },
      }).unwrap();
      resetHues();
      await refetchUser();
    }
    await refetchThemes();
  };

  const handleSaved = async () => {
    closeModal();
    await refetchThemes();
  };

  const openEditor = (existing?: ThemeResponse) => {
    openModal({
      title: existing ? "Edit theme" : "New theme",
      content: (
        <ThemeEditor
          existing={existing}
          organizations={organizations}
          onSaved={() => {
            void handleSaved();
          }}
          onCancel={closeModal}
        />
      ),
    });
  };

  return {
    isLoading: userState.state === "loading",
    presets: themePresets,
    themes,
    activeThemeId,
    customPresetActive: !activeThemeId && customTheme,
    organizations,
    userId: registeredUser?.id,
    activatePreset,
    activateCustom,
    deleteCustom,
    openEditor,
  };
}
