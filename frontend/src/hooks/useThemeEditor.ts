// Form state + save flow for the ThemeEditor modal. Keeps the visual ThemeEditor
// component as pure JSX wiring: every piece of mutable state, the RTK mutations,
// and the multi-step save (create/update → upload background → upload logo) live
// here. Returns `state`, `handlers`, and `isSaving` so the view never imports
// RTK Query directly.
import { useState } from "react";
import {
  useCreateThemeMutation,
  useUpdateThemeMutation,
  useUploadBackgroundMutation,
  useUploadLogoMutation,
  type CreateThemeRequest,
  type ThemeResponse,
  type UpdateThemeRequest,
} from "../store/AmbiApi";
import { extractErrorMessage } from "../utils/utils";
import { apiToUiMode, uiToApiMode } from "../utils/themeMode";

// Sentinel scope value used in the dropdown for "no org / personal theme".
// The backend stores an empty string for personal, so we map it back on save.
const PERSONAL_SCOPE = "__personal__";

const MAX_BACKGROUND_BYTES = 5 * 1024 * 1024;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

type Mode = "light" | "dark" | "system";

interface UseThemeEditorOptions {
  existing?: ThemeResponse;
  onSaved: (theme: ThemeResponse) => void;
}

interface ThemeEditorState {
  name: string;
  huePrimary: number;
  hueAccent: number;
  mode: Mode;
  scopeId: string;
  bgPreview: string | null;
  logoPreview: string | null;
  error: string | null;
  isSaving: boolean;
}

interface ThemeEditorHandlers {
  setName: (value: string) => void;
  setHuePrimary: (value: number) => void;
  setHueAccent: (value: number) => void;
  setMode: (value: Mode) => void;
  setScopeId: (value: string) => void;
  handleBgFiles: (files: File[]) => void;
  handleLogoFiles: (files: File[]) => void;
  save: () => Promise<void>;
}

interface UseThemeEditorResult {
  state: ThemeEditorState;
  handlers: ThemeEditorHandlers;
}

const useThemeEditor = ({
  existing,
  onSaved,
}: UseThemeEditorOptions): UseThemeEditorResult => {
  const [name, setName] = useState(existing?.name ?? "");
  const [huePrimary, setHuePrimary] = useState(existing?.huePrimary ?? 260);
  const [hueAccent, setHueAccent] = useState(existing?.hueAccent ?? 25);
  const [mode, setMode] = useState<Mode>(() => apiToUiMode(existing?.mode));

  const [scopeId, setScopeId] = useState<string>(() => {
    const existingOrg = existing?.organizationId;
    if (existingOrg && existingOrg !== "") return existingOrg;
    return PERSONAL_SCOPE;
  });

  const [bgPreview, setBgPreview] = useState<string | null>(
    existing?.backgroundImageUrl ?? null,
  );
  const [logoPreview, setLogoPreview] = useState<string | null>(
    existing?.logoImageUrl ?? null,
  );
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [createTheme] = useCreateThemeMutation();
  const [updateTheme] = useUpdateThemeMutation();
  const [uploadBackground] = useUploadBackgroundMutation();
  const [uploadLogo] = useUploadLogoMutation();

  // FileUpload reports the full accumulated list on every change; take the
  // most recent entry so re-picking replaces the prior choice.
  const handleBgFiles = (files: File[]) => {
    const file = files.at(-1);
    if (!file) return;
    if (file.size > MAX_BACKGROUND_BYTES) {
      setError("Background image exceeds 5 MB.");
      return;
    }
    setBgFile(file);
    setBgPreview(URL.createObjectURL(file));
  };

  const handleLogoFiles = (files: File[]) => {
    const file = files.at(-1);
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo image exceeds 2 MB.");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    if (!name.trim()) {
      setError("Theme name is required.");
      return;
    }
    setError(null);
    setIsSaving(true);

    try {
      let saved: ThemeResponse;
      const orgId = scopeId === PERSONAL_SCOPE ? "" : scopeId;

      if (existing?.id) {
        const req: UpdateThemeRequest = {
          name: name.trim(),
          huePrimary,
          hueAccent,
          mode: uiToApiMode(mode),
          organizationId: orgId,
        };
        saved = await updateTheme({
          id: existing.id,
          updateThemeRequest: req,
        }).unwrap();
      } else {
        const req: CreateThemeRequest = {
          name: name.trim(),
          huePrimary,
          hueAccent,
          mode: uiToApiMode(mode),
          organizationId: orgId,
        };
        saved = await createTheme({ createThemeRequest: req }).unwrap();
      }

      if (bgFile && saved.id) {
        const fd = new FormData();
        fd.append("image", bgFile);
        saved = await uploadBackground({
          id: saved.id,
          body: fd as unknown as { image: Blob },
        }).unwrap();
      }

      if (logoFile && saved.id) {
        const fd = new FormData();
        fd.append("image", logoFile);
        saved = await uploadLogo({
          id: saved.id,
          body: fd as unknown as { image: Blob },
        }).unwrap();
      }

      onSaved(saved);
    } catch (err: unknown) {
      setError(
        extractErrorMessage(err, "Failed to save theme. Please try again."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return {
    state: {
      name,
      huePrimary,
      hueAccent,
      mode,
      scopeId,
      bgPreview,
      logoPreview,
      error,
      isSaving,
    },
    handlers: {
      setName,
      setHuePrimary,
      setHueAccent,
      setMode,
      setScopeId,
      handleBgFiles,
      handleLogoFiles,
      save,
    },
  };
};

export { useThemeEditor, PERSONAL_SCOPE };
export type { Mode as ThemeEditorMode, UseThemeEditorResult };
