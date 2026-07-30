// Account "Theme" tab. Theme management (browse presets + your themes, create,
// edit, delete) lives in the shared ThemeModal; this section opens it and, on
// apply, copies the chosen theme's spec into the user's preferences so it
// becomes their personal look.
//
// NOTE: the persisted spec is the source of truth for a registered user's look
// (see useTheme). Applying here writes it server-side; the live UI reconciles
// from `preferences.theme` on the next /api/users/me read.
import { Btn } from "@ui/Buttons/Btn";
import { useModal } from "@hooks/useModal";
import { ThemeModal } from "@components/Theme/ThemeModal/ThemeModal";
import { useGetMeQuery } from "@auth/store/userApi.gen";
import { useUpdatePreferencesMutation } from "@account/store/accountApi.gen";
import { type ThemeResponse } from "@features/theme/store/themeApi.gen";
import { defaultThemeIdForSpec } from "@features/theme/defaultThemes";
import styles from "./AccountPage.module.css";

const AccountThemeSection = () => {
  const { openModal, closeModal } = useModal();
  const { data: profile } = useGetMeQuery();
  const [savePreferences] = useUpdatePreferencesMutation();

  const applyTheme = (theme: ThemeResponse) => {
    // PUT preferences is a wholesale replace, so resend the rest alongside the
    // new theme spec to avoid clobbering them (mirrors useTheme).
    const prefs = profile?.preferences;
    void savePreferences({
      updatePreferencesRequest: {
        newsletter: prefs?.newsletter ?? false,
        marketing: prefs?.marketing ?? false,
        stayLoggedIn: prefs?.stayLoggedIn ?? false,
        theme: theme.spec,
      },
    });
  };

  const openThemeModal = () => {
    openModal({
      title: "Theme",
      content: (
        <ThemeModal
          // Preferences store a spec, not a theme id, so "which card is active"
          // is only answerable for the two defaults — a saved palette could have
          // come from any theme, or from one since edited or deleted.
          activeThemeId={defaultThemeIdForSpec(profile?.preferences?.theme)}
          onApply={applyTheme}
          onClose={closeModal}
        />
      ),
    });
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Theme</h2>
      <p>
        Pick a preset or one of your saved themes, or create your own. Applying a
        theme updates your personal look across Ambi.
      </p>
      <Btn onClick={openThemeModal}>Browse themes</Btn>
    </section>
  );
};

export { AccountThemeSection };
