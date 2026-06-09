// Theme picker + creator. Lists the built-in presets and the caller's personal
// themes as swatch cards, and hosts the "create your own" editor inline. It is
// reusable across surfaces: the modal owns listing / create / edit / delete (all
// context-independent, via useThemes), while the caller owns what "apply" means
// through `onApply` — the deck editor writes `deck.themeId`, the account page
// copies the spec into the user's preferences.
//
// Rendered as the body of the shared Modal (so the dialog frame + close come
// from there). Selecting a theme applies it and closes; the editor swaps in for
// the list while creating/editing, and the GalleryPicker swaps in within the
// editor while choosing an image — one dialog throughout.
import { useState } from "react";
import { Btn } from "@ui/Buttons/Btn";
import { Badge } from "@ui/Badge/Badge";
import { EmptyState } from "@ui/EmptyState/EmptyState";
import { useThemes } from "@hooks/useThemes";
import type { ThemeResponse } from "@features/theme/store/themeApi.gen";
import { ThemeEditor, type ThemeEditorSubmit } from "./ThemeEditor";
import styles from "./ThemeModal.module.css";

const DEFAULT_HUE_PRIMARY = 290;
const DEFAULT_HUE_ACCENT = 50;

interface ThemeModalProps {
  /** The theme currently applied in the calling context, highlighted as Active. */
  activeThemeId?: string;
  onApply: (theme: ThemeResponse) => void;
  onClose: () => void;
}

interface ThemeCardProps {
  theme: ThemeResponse;
  isActive: boolean;
  onApply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ThemeCard = ({
  theme,
  isActive,
  onApply,
  onEdit,
  onDelete,
}: ThemeCardProps) => {
  const huePrimary = theme.spec?.huePrimary ?? DEFAULT_HUE_PRIMARY;
  const hueAccent = theme.spec?.hueAccent ?? DEFAULT_HUE_ACCENT;
  const canManage = theme.permissions.canManage;

  return (
    <div className={`${styles.card} ${isActive ? styles.cardActive : ""}`}>
      <div className={styles.swatch} aria-hidden='true'>
        <div
          className={styles.swatchBand}
          style={{ background: `oklch(55% 0.2 ${huePrimary}deg)` }}
        />
        <div
          className={styles.swatchBand}
          style={{ background: `oklch(65% 0.22 ${hueAccent}deg)` }}
        />
      </div>
      <div className={styles.cardBody}>
        <p className={styles.cardName} title={theme.name}>
          {theme.name}
        </p>
        <div className={styles.cardBadges}>
          {isActive && <Badge label='Active' variant='primary' size='sm' />}
          {theme.builtIn && (
            <Badge label='Built-in' variant='secondary' size='sm' />
          )}
          {theme.ownership?.type === "ORGANIZATION" && (
            <Badge label='Org' variant='info' size='sm' />
          )}
        </div>
      </div>
      <div className={styles.cardActions}>
        <Btn
          size='sm'
          onClick={onApply}
          disabled={isActive}
          variant={isActive ? "disabled" : "primary"}>
          {isActive ? "Applied" : "Apply"}
        </Btn>
        {canManage && (
          <Btn size='sm' variant='secondary' fill='bordered' onClick={onEdit}>
            Edit
          </Btn>
        )}
        {canManage && (
          <Btn size='sm' variant='error' fill='ghost' onClick={onDelete}>
            Delete
          </Btn>
        )}
      </div>
    </div>
  );
};

const ThemeModal = ({ activeThemeId, onApply, onClose }: ThemeModalProps) => {
  const {
    builtInThemes,
    myThemes,
    isLoading,
    createTheme,
    updateTheme,
    deleteTheme,
    isSaving,
  } = useThemes();

  // `null` = list view; `{}` = creating; a theme = editing it.
  const [editing, setEditing] = useState<ThemeResponse | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApply = (theme: ThemeResponse) => {
    onApply(theme);
    onClose();
  };

  const handleDelete = async (theme: ThemeResponse) => {
    if (!window.confirm(`Delete "${theme.name}"? This cannot be undone.`)) {
      return;
    }
    setError(null);
    try {
      await deleteTheme(theme.id ?? "");
    } catch {
      setError("Could not delete the theme. Please try again.");
    }
  };

  const handleSave = async (input: ThemeEditorSubmit) => {
    setError(null);
    try {
      if (editing && editing !== "new") {
        await updateTheme(editing.id ?? "", {
          name: input.name,
          spec: input.spec,
        });
      } else {
        await createTheme(input);
      }
      setEditing(null);
    } catch {
      setError("Could not save the theme. Please try again.");
    }
  };

  if (editing) {
    return (
      <div className={styles.modal}>
        {error && <p className={styles.error}>{error}</p>}
        <ThemeEditor
          initial={editing === "new" ? undefined : editing}
          isSaving={isSaving}
          onSave={handleSave}
          onCancel={() => {
            setEditing(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.modal}>
      {error && <p className={styles.error}>{error}</p>}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Your themes</h3>
        <div className={styles.grid}>
          <button
            type='button'
            className={styles.newCard}
            onClick={() => {
              setEditing("new");
            }}>
            + New theme
          </button>
          {myThemes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isActive={theme.id === activeThemeId}
              onApply={() => {
                handleApply(theme);
              }}
              onEdit={() => {
                setEditing(theme);
              }}
              onDelete={() => {
                void handleDelete(theme);
              }}
            />
          ))}
        </div>
        {!isLoading && myThemes.length === 0 && (
          <EmptyState
            title='No personal themes yet'
            message='Create one to reuse your look across decks.'
          />
        )}
      </section>

      {builtInThemes.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Presets</h3>
          <div className={styles.grid}>
            {builtInThemes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isActive={theme.id === activeThemeId}
                onApply={() => {
                  handleApply(theme);
                }}
                onEdit={() => {
                  setEditing(theme);
                }}
                onDelete={() => {
                  void handleDelete(theme);
                }}
              />
            ))}
          </div>
        </section>
      )}

      <div className={styles.editorActions}>
        <Btn variant='secondary' fill='bordered' onClick={onClose}>
          Close
        </Btn>
      </div>
    </div>
  );
};

export { ThemeModal };
export type { ThemeModalProps };
