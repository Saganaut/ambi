// Theme settings section: preset themes, custom themes, and theme editor.
// Activation, deletion, and the editor-modal launcher all flow through
// useThemePicker so the deck-editor sidebar can reuse the exact same behavior.
import { useState } from "react";
import { useThemePicker } from "../../hooks/useThemePicker";
import { ThemeCard } from "./ThemeCard";
import styles from "./ThemeSection.module.css";
import accountStyles from "./AccountPage.module.css";
import { Btn } from "@/components/Common/Buttons/Btn";

const ThemeSection = () => {
  const {
    presets,
    themes,
    activeThemeId,
    customPresetActive,
    userId,
    activatePreset,
    activateCustom,
    deleteCustom,
    openEditor,
  } = useThemePicker();

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (theme: Parameters<typeof deleteCustom>[0]) => {
    setDeleteError(null);
    try {
      await deleteCustom(theme);
    } catch {
      setDeleteError("Failed to delete theme.");
    }
  };

  return (
    <section className={accountStyles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={accountStyles.sectionTitle}>Theme Settings</h2>
        <Btn
          type='button'
          onClick={() => {
            openEditor();
          }}>
          + New theme
        </Btn>
      </div>

      <div>
        <p className={styles.subsectionTitle}>Presets</p>
        <div className={styles.themeGrid}>
          {presets.map((preset) => {
            // Brand preset is the default when the user has no active custom
            // theme and hasn't customized the hues — it's the implicit Active.
            const isBrandDefault =
              !activeThemeId &&
              !customPresetActive &&
              preset.label === "Brand";
            return (
              <ThemeCard
                key={preset.label}
                huePrimary={preset.huePrimary}
                hueAccent={preset.hueAccent}
                name={preset.label}
                isActive={isBrandDefault}
                onActivate={() => {
                  void activatePreset(preset);
                }}
              />
            );
          })}
        </div>
      </div>

      {themes.length > 0 && (
        <div>
          <p className={styles.subsectionTitle}>Custom Themes</p>
          <div className={styles.themeGrid}>
            {themes.map((theme) => {
              const isOwned = theme.ownerId === userId;
              const isOrgShared =
                theme.organizationId != null &&
                theme.organizationId !== "" &&
                theme.ownerId !== userId;
              return (
                <ThemeCard
                  key={theme.id}
                  huePrimary={theme.huePrimary ?? 260}
                  hueAccent={theme.hueAccent ?? 25}
                  name={theme.name ?? "Untitled"}
                  isActive={theme.id === activeThemeId}
                  isOrgShared={isOrgShared}
                  onActivate={() => {
                    void activateCustom(theme);
                  }}
                  onEdit={
                    isOwned
                      ? () => {
                          openEditor(theme);
                        }
                      : undefined
                  }
                  onDelete={
                    isOwned
                      ? () => {
                          void handleDelete(theme);
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {deleteError && <p className={accountStyles.error}>{deleteError}</p>}
    </section>
  );
};

export { ThemeSection };
