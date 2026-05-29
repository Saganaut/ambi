// Form to create or edit a custom theme. Pure JSX wiring — every piece of
// mutable state, the RTK mutations, and the create → upload-bg → upload-logo
// save flow live in `useThemeEditor`. The dialog itself is rendered inside the
// shared Modal (see useModal); callers open/close it and supply the list of
// orgs the author can pick from.
import type { ThemeResponse } from "../../store/AmbiApi";
import { useThemeEditor, PERSONAL_SCOPE } from "@/hooks/useThemeEditor";
import styles from "./ThemeSection.module.css";
import { Alert } from "@/components/Common/Alert/Alert";
import { Btn } from "@/components/Common/Buttons/Btn";
import { Dropdown } from "@/components/Common/Input/Dropdown/Dropdown";
import { FileUpload } from "@/components/Common/Input/FileUpload/FileUpload";
import { ColorPicker } from "@/components/Common/Input/ColorPicker/ColorPicker";
import { Input } from "@/components/Common/Input/Input/Input";
import { RadioGroup } from "@/components/Common/Input/RadioGroup/RadioGroup";

const MODE_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

interface OrgOption {
  id: string;
  name: string;
}

interface ThemeEditorProps {
  /** Provide an existing theme to edit it; omit to create a new one. */
  existing?: ThemeResponse;
  /** Organizations the user belongs to. Empty list = personal-only. */
  organizations?: OrgOption[];
  onSaved: (theme: ThemeResponse) => void;
  onCancel: () => void;
}

const ThemeEditor = ({
  existing,
  organizations = [],
  onSaved,
  onCancel,
}: ThemeEditorProps) => {
  const { state, handlers } = useThemeEditor({ existing, onSaved });

  const scopeOptions = [
    { value: PERSONAL_SCOPE, label: "Personal (only you)" },
    ...organizations.map((o) => ({ value: o.id, label: o.name })),
  ];

  return (
    <div className={styles.editorForm}>
      <Input
        id='theme-name'
        type='text'
        label='Name'
        value={state.name}
        onChange={(e) => {
          handlers.setName(e.target.value);
        }}
        placeholder='My Theme'
        maxLength={64}
        fullWidth
      />

      <div className={styles.fieldGroup}>
        <ColorPicker
          label='Primary'
          value={state.huePrimary}
          onChange={handlers.setHuePrimary}
        />
        <ColorPicker
          label='Accent'
          value={state.hueAccent}
          onChange={handlers.setHueAccent}
        />
      </div>

      <RadioGroup
        name='theme-mode'
        legend='Mode'
        options={MODE_OPTIONS}
        value={state.mode}
        onChange={(v) => {
          handlers.setMode(v as typeof state.mode);
        }}
      />

      <div className={styles.fieldGroup}>
        <div className={styles.uploadRow}>
          {state.bgPreview ? (
            <img
              src={state.bgPreview}
              alt='Background preview'
              className={styles.uploadThumb}
            />
          ) : (
            <div className={styles.uploadThumbPlaceholder} aria-hidden='true'>
              None
            </div>
          )}
          <FileUpload
            label='Background Image'
            accept='image/jpeg,image/png,image/webp'
            onChange={handlers.handleBgFiles}
            infoMessage='JPEG, PNG, or WebP · max 5 MB · max 2000 px (optional)'
          />
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <div className={styles.uploadRow}>
          {state.logoPreview ? (
            <img
              src={state.logoPreview}
              alt='Logo preview'
              className={styles.uploadThumb}
            />
          ) : (
            <div className={styles.uploadThumbPlaceholder} aria-hidden='true'>
              None
            </div>
          )}
          <FileUpload
            label='Logo Image'
            accept='image/jpeg,image/png,image/webp,image/gif'
            onChange={handlers.handleLogoFiles}
            infoMessage='JPEG, PNG, WebP, or GIF · max 2 MB · resized to 400×400 (optional)'
          />
        </div>
      </div>

      <Dropdown
        id='theme-scope'
        label='Scope'
        options={scopeOptions}
        value={[state.scopeId]}
        onChange={(values) => {
          if (values[0]) handlers.setScopeId(values[0]);
        }}
        infoMessage={
          organizations.length === 0
            ? "Join an organization to share themes with its members."
            : undefined
        }
      />

      {state.error != null && state.error !== "" && (
        <Alert severity='error'>{state.error}</Alert>
      )}

      <div className={styles.editorActions}>
        <Btn type='button' onClick={onCancel} disabled={state.isSaving}>
          Cancel
        </Btn>
        <Btn
          type='button'
          onClick={() => {
            void handlers.save();
          }}
          disabled={state.isSaving}>
          {state.isSaving ? "Saving..." : "Save theme"}
        </Btn>
      </div>
    </div>
  );
};

export { ThemeEditor };
export type { OrgOption };
