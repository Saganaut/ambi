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
import { Btn } from "@saganaut/ambi-ui";
import { Badge } from "@ui/Badge/Badge";
import { EmptyState } from "@ui/EmptyState/EmptyState";
import { CheckIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useThemes } from "@hooks/useThemes";
import type { ThemeResponse } from "@features/theme/store/themeApi.gen";
import { PALETTE_PREVIEW_ROLES } from "@features/theme/palette";
import { appearanceValue, paletteStyle, roleVar } from "@utils/applyPalette";
import { ThemeEditor, type ThemeEditorSubmit } from "./ThemeEditor";
import styles from "./ThemeModal.module.css";

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

// Compact row card (DS Figma 627-3461): theme-canvas background with the name
// on the left and the palette as overlapping pips on the right. The card
// itself is the Apply control; Edit/Delete float in on hover or focus so the
// resting state stays quiet.
//
// The card is a theme scope: it carries the theme's palette as inline role vars
// plus its appearance flag, and paints itself from var(--role-*). That is one
// path for both kinds of theme — a curated palette paints from its own inline
// vars, a palette-less default from the tokens.css block its flag selects.
const ThemeCard = ({
  theme,
  isActive,
  onApply,
  onEdit,
  onDelete,
}: ThemeCardProps) => {
  const spec = theme.spec;
  const canManage = theme.permissions.canManage;

  return (
    <div className={styles.cardWrap}>
      <button
        type='button'
        className={`${styles.card} ${isActive ? styles.cardActive : ""}`}
        style={paletteStyle(spec)}
        data-appearance={appearanceValue(spec)}
        aria-pressed={isActive}
        onClick={isActive ? undefined : onApply}>
        <span className={styles.cardName} title={theme.name}>
          {theme.name}
        </span>
        {theme.ownership?.type === "ORGANIZATION" && (
          <Badge label='Org' variant='info' size='sm' />
        )}
        <span className={styles.pips} aria-hidden='true'>
          {PALETTE_PREVIEW_ROLES.map((role) => (
            <span
              key={role}
              className={styles.pip}
              style={{ background: `var(${roleVar(role)})` }}
            />
          ))}
        </span>
        {isActive && (
          <span className={styles.activeBadge}>
            <CheckIcon aria-hidden='true' />
          </span>
        )}
      </button>
      {canManage && (
        <span className={styles.cardManage}>
          <Btn
            size='sm'
            variant='secondary'
            fill='ghost'
            icon={<PencilIcon aria-hidden='true' />}
            aria-label={`Edit ${theme.name ?? "theme"}`}
            onClick={onEdit}
          />
          <Btn
            size='sm'
            variant='error'
            fill='ghost'
            icon={<TrashIcon aria-hidden='true' />}
            aria-label={`Delete ${theme.name ?? "theme"}`}
            onClick={onDelete}
          />
        </span>
      )}
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
