// Theme creator/editor — the "create your own" half of the ThemeModal. Edits a
// name, a light/dark appearance, the 16 palette role colours (one swatch each,
// grouped), and optional background + logo images. Image selection reuses the
// GalleryPicker rendered inline (the ModalProvider hosts one dialog at a time,
// so we swap views inside this one rather than stacking a second modal).
//
// Saving hands the assembled { name, spec, organizationId? } back to the caller,
// which decides whether that is a create (PUT) or an update (PATCH). The spec's
// palette is what tokens.css paints from (see applyPalette).
import { useState } from "react";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Btn } from "@ui/Buttons/Btn";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { Input } from "@components/Forms/Input/Input/Input";
import { Dropdown } from "@components/Forms/Input/Dropdown/Dropdown";
import { GalleryPicker } from "@components/Media/GalleryPicker/GalleryPicker";
import { isImageEmpty, resolveImageUrl } from "@utils/image";
import { useListMyOrgsQuery } from "@features/org/store/orgApi.gen";
import { type AppImage } from "@features/gallery/store/galleryApi.gen";
import {
  type Palette,
  type ThemeResponse,
  type ThemeSpec,
} from "@features/theme/store/themeApi.gen";
import { ThemeAppearance } from "@features/theme/store/themeEnums.gen";
import { DEFAULT_PALETTE, PALETTE_PREVIEW_ROLES } from "@features/theme/palette";
import { useCurrentUser } from "@auth/hooks/useCurrentUser";
import styles from "./ThemeModal.module.css";

const APPEARANCES: { value: ThemeAppearance; label: string }[] = [
  { value: ThemeAppearance.LIGHT, label: "Light" },
  { value: ThemeAppearance.DARK, label: "Dark" },
];

// The 16 roles, grouped for the editor. Labels are short since each sits beside
// its colour swatch.
const ROLE_GROUPS: { title: string; roles: { key: keyof Palette; label: string }[] }[] = [
  {
    title: "Surfaces",
    roles: [
      { key: "canvas", label: "Canvas" },
      { key: "surface", label: "Surface" },
      { key: "surfaceRaised", label: "Raised" },
      { key: "subtle", label: "Subtle" },
    ],
  },
  {
    title: "Text",
    roles: [
      { key: "foreground", label: "Text" },
      { key: "mutedForeground", label: "Muted" },
    ],
  },
  {
    title: "Brand",
    roles: [
      { key: "primary", label: "Primary" },
      { key: "onPrimary", label: "On primary" },
      { key: "accent", label: "Accent" },
      { key: "accentSecondary", label: "Accent 2" },
    ],
  },
  {
    title: "Structure",
    roles: [
      { key: "border", label: "Border" },
      { key: "borderSubtle", label: "Border sub" },
    ],
  },
  {
    title: "Status",
    roles: [
      { key: "red", label: "Error" },
      { key: "green", label: "Success" },
      { key: "yellow", label: "Warning" },
      { key: "blue", label: "Info" },
    ],
  },
];

export interface ThemeEditorSubmit {
  name: string;
  spec: ThemeSpec;
  organizationId?: string;
}

interface ThemeEditorProps {
  /** When present, the editor edits this theme; otherwise it creates a new one. */
  initial?: ThemeResponse;
  isSaving: boolean;
  onSave: (input: ThemeEditorSubmit) => void;
  onCancel: () => void;
}

type PickTarget = "background" | "logo" | null;

interface ImageSlotProps {
  label: string;
  image: AppImage | undefined;
  seed: string;
  onPick: () => void;
  onClear: () => void;
}

const ImageSlot = ({ label, image, seed, onPick, onClear }: ImageSlotProps) => {
  const hasImage = !isImageEmpty(image);
  const thumb = resolveImageUrl(image, "SM", seed, 200, 113, false);
  return (
    <div className={styles.imageSlot}>
      <span className={styles.fieldLabel}>{label}</span>
      <button
        type='button'
        className={styles.imageTile}
        onClick={onPick}
        aria-label={`Choose ${label.toLowerCase()} image`}>
        {hasImage && thumb ? (
          <img src={thumb} alt='' />
        ) : (
          <span className={styles.imageTileEmpty}>
            <PhotoIcon aria-hidden='true' />
            <span>Choose</span>
          </span>
        )}
        {hasImage && (
          <IconBtn
            fill='ghost'
            size='xs'
            className={styles.imageClear}
            icon={<XMarkIcon />}
            aria-label={`Clear ${label.toLowerCase()} image`}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          />
        )}
      </button>
    </div>
  );
};

interface SwatchFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const SwatchField = ({ label, value, onChange }: SwatchFieldProps) => (
  <label className={styles.swatchField}>
    <input
      type='color'
      className={styles.swatchInput}
      value={value}
      aria-label={label}
      onChange={(e) => {
        onChange(e.target.value);
      }}
    />
    <span className={styles.swatchFieldLabel}>{label}</span>
  </label>
);

const ThemeEditor = ({
  initial,
  isSaving,
  onSave,
  onCancel,
}: ThemeEditorProps) => {
  const initSpec = initial?.spec;
  const [name, setName] = useState(initial?.name ?? "");
  const [appearance, setAppearance] = useState<ThemeAppearance>(
    (initSpec?.appearance as ThemeAppearance) ?? ThemeAppearance.LIGHT,
  );
  // A complete palette is always edited; a new theme (or a legacy spec with no
  // palette) starts from the brand default.
  const [palette, setPalette] = useState<Palette>({
    ...DEFAULT_PALETTE,
    ...initSpec?.palette,
  });
  const [backgroundImage, setBackgroundImage] = useState<AppImage | undefined>(
    initSpec?.backgroundImage,
  );
  const [logoImage, setLogoImage] = useState<AppImage | undefined>(
    initSpec?.logoImage,
  );
  const [picking, setPicking] = useState<PickTarget>(null);
  // Empty = personal; otherwise the owning org id. Ownership is fixed at
  // creation, so this selector only appears for new themes.
  const [organizationId, setOrganizationId] = useState("");

  // Orgs the caller may create shared themes for (OWNER/ADMIN); auth-gated, so
  // skipped for anyone not registered.
  const userState = useCurrentUser();
  const isRegistered = userState.state === "registered";
  const { data: myOrgs = [] } = useListMyOrgsQuery(undefined, {
    skip: !isRegistered || initial != null,
  });
  const manageableOrgs = myOrgs.filter(
    (o) => o.role === "OWNER" || o.role === "ADMIN",
  );

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0 && !isSaving;
  const seedBase = initial?.id ?? "new-theme";

  const setRole = (key: keyof Palette, value: string) => {
    setPalette((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: trimmedName,
      spec: { appearance, palette, backgroundImage, logoImage },
      organizationId: organizationId || undefined,
    });
  };

  // Inline image picker — swaps in for the form while the author browses.
  if (picking) {
    return (
      <GalleryPicker
        // No deck to scope a crop to: theme images sit outside the deck
        // adoption model, so a crop here still becomes a gallery entry (v1).
        current={picking === "background" ? backgroundImage : logoImage}
        onPick={(img) => {
          if (picking === "background") setBackgroundImage(img);
          else setLogoImage(img);
          setPicking(null);
        }}
        onClose={() => {
          setPicking(null);
        }}
      />
    );
  }

  return (
    <div className={styles.editor}>
      <Input
        label='Theme name'
        id='theme-name'
        type='text'
        fullWidth
        value={name}
        placeholder='My theme'
        onChange={(e) => {
          setName(e.target.value);
        }}
      />

      <div className={styles.field}>
        <span className={styles.fieldLabel}>Appearance</span>
        <div className={styles.modeRow}>
          {APPEARANCES.map((a) => {
            const active = appearance === a.value;
            return (
              <Btn
                key={a.value}
                size='sm'
                variant={active ? "primary" : "secondary"}
                fill={active ? "default" : "bordered"}
                onClick={() => {
                  setAppearance(a.value);
                }}>
                {a.label}
              </Btn>
            );
          })}
        </div>
      </div>

      {ROLE_GROUPS.map((group) => (
        <div key={group.title} className={styles.roleGroup}>
          <p className={styles.roleGroupTitle}>{group.title}</p>
          <div className={styles.roleGrid}>
            {group.roles.map((role) => (
              <SwatchField
                key={role.key}
                label={role.label}
                value={palette[role.key] ?? "#000000"}
                onChange={(value) => {
                  setRole(role.key, value);
                }}
              />
            ))}
          </div>
        </div>
      ))}

      <div className={styles.imageRow}>
        <ImageSlot
          label='Background'
          image={backgroundImage}
          seed={`${seedBase}-bg`}
          onPick={() => {
            setPicking("background");
          }}
          onClear={() => {
            setBackgroundImage(undefined);
          }}
        />
        <ImageSlot
          label='Logo'
          image={logoImage}
          seed={`${seedBase}-logo`}
          onPick={() => {
            setPicking("logo");
          }}
          onClear={() => {
            setLogoImage(undefined);
          }}
        />
      </div>

      {/* Ownership is fixed at creation (UpdateThemeRequest carries no
          organizationId), so the owner selector only shows when creating, and
          only when the caller manages at least one org. Org names aren't
          modelled yet, so options are labelled by org id for now. */}
      {!initial && manageableOrgs.length > 0 && (
        <div className={styles.field}>
          <Dropdown
            label='Owner'
            id='theme-owner'
            value={[organizationId]}
            onChange={(vals) => {
              setOrganizationId(vals[0] ?? "");
            }}
            options={[
              { value: "", label: "Just me (personal)" },
              ...manageableOrgs.map((o) => ({
                value: o.orgId,
                label: `Organization ${o.orgId}`,
              })),
            ]}
          />
        </div>
      )}

      <div
        className={styles.preview}
        data-appearance={appearance === "DARK" ? "dark" : "light"}
        style={{ background: palette.canvas, color: palette.foreground }}>
        {PALETTE_PREVIEW_ROLES.map((key) => (
          <span
            key={key}
            className={styles.previewDot}
            style={{ background: palette[key] }}
            aria-hidden='true'
          />
        ))}
        <span className={styles.previewLabel}>{trimmedName || "Preview"}</span>
      </div>

      <div className={styles.editorActions}>
        <Btn variant='secondary' fill='bordered' onClick={onCancel}>
          Cancel
        </Btn>
        <Btn onClick={handleSave} disabled={!canSave} isLoading={isSaving}>
          {initial ? "Save changes" : "Create theme"}
        </Btn>
      </div>
    </div>
  );
};

export { ThemeEditor };
