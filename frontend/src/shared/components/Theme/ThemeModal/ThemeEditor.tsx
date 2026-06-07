// Theme creator/editor — the "create your own" half of the ThemeModal. Edits a
// name, light/dark/system mode, the two brand hues (ColorPicker), and optional
// background + logo images. Image selection reuses the GalleryPicker rendered
// inline (the ModalProvider hosts one dialog at a time, so we swap views inside
// this one rather than stacking a second modal).
//
// Saving hands the assembled { name, spec, organizationId? } back to the caller,
// which decides whether that is a create (PUT) or an update (PATCH).
import { useState } from "react";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Btn } from "@ui/Buttons/Btn";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { Input } from "@components/Forms/Input/Input/Input";
import { Dropdown } from "@components/Forms/Input/Dropdown/Dropdown";
import { ColorPicker } from "@components/Forms/Input/ColorPicker/ColorPicker";
import { GalleryPicker } from "@components/Media/GalleryPicker/GalleryPicker";
import { isImageEmpty, resolveImageUrl } from "@utils/image";
import { useListMyOrgsQuery, type AppImage, type ThemeResponse, type ThemeSpec } from "@store/AmbiApi";
import { useCurrentUser } from "@auth/hooks/useCurrentUser";
import styles from "./ThemeModal.module.css";

type Mode = "LIGHT" | "DARK" | "SYSTEM";

// Brand primary/accent hues — the same defaults useTheme falls back to.
const DEFAULT_HUE_PRIMARY = 290;
const DEFAULT_HUE_ACCENT = 50;

const MODES: { value: Mode; label: string }[] = [
  { value: "LIGHT", label: "Light" },
  { value: "DARK", label: "Dark" },
  { value: "SYSTEM", label: "System" },
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

const ThemeEditor = ({
  initial,
  isSaving,
  onSave,
  onCancel,
}: ThemeEditorProps) => {
  const initSpec = initial?.spec;
  const [name, setName] = useState(initial?.name ?? "");
  const [mode, setMode] = useState<Mode>((initSpec?.mode as Mode) ?? "SYSTEM");
  const [huePrimary, setHuePrimary] = useState(
    initSpec?.huePrimary ?? DEFAULT_HUE_PRIMARY,
  );
  const [hueAccent, setHueAccent] = useState(
    initSpec?.hueAccent ?? DEFAULT_HUE_ACCENT,
  );
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

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: trimmedName,
      spec: { mode, huePrimary, hueAccent, backgroundImage, logoImage },
      organizationId: organizationId || undefined,
    });
  };

  // Inline image picker — swaps in for the form while the author browses.
  if (picking) {
    return (
      <GalleryPicker
        initialUrl={
          (picking === "background" ? backgroundImage : logoImage)?.externalSrc
        }
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
        <span className={styles.fieldLabel}>Mode</span>
        <div className={styles.modeRow}>
          {MODES.map((m) => {
            const active = mode === m.value;
            return (
              <Btn
                key={m.value}
                size='sm'
                variant={active ? "primary" : "secondary"}
                fill={active ? "default" : "bordered"}
                onClick={() => {
                  setMode(m.value);
                }}>
                {m.label}
              </Btn>
            );
          })}
        </div>
      </div>

      <div className={styles.hueRow}>
        <ColorPicker
          label='Primary'
          value={huePrimary}
          onChange={setHuePrimary}
        />
        <ColorPicker label='Accent' value={hueAccent} onChange={setHueAccent} />
      </div>

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

      <div className={styles.preview}>
        <span
          className={styles.previewDot}
          style={{ background: `oklch(55% 0.2 ${huePrimary}deg)` }}
          aria-hidden='true'
        />
        <span
          className={styles.previewDot}
          style={{ background: `oklch(65% 0.22 ${hueAccent}deg)` }}
          aria-hidden='true'
        />
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
