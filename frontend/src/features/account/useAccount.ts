/* eslint-disable react-x/set-state-in-effect */
// Account-settings logic layer between the generated user API and the account
// page. Owns every bit of state and every mutation the settings screen needs
// (profile read, display-name edit, built-in avatar pick, newsletter
// preference, timezone auto-detect) so the page component is pure UI.
//
// Maps onto the new self-service user endpoints (UserController):
//   GET   /api/users/me              → useGetMeQuery        (full self profile)
//   PATCH /api/users/me              → useUpdateMeMutation  (sparse profile edit)
//   PUT   /api/users/me/preferences  → useUpdatePreferencesMutation (wholesale)
//
// Preferences are PUT wholesale, so a single-field toggle has to resend the
// whole UserPreferences object — we merge the change onto the server's current
// preferences before sending.
import { useEffect, useRef, useState } from "react";
import { useGetMeQuery, useUpdateMeMutation } from "@auth/store/userApi.gen";
import { useUpdatePreferencesMutation, type UserProfileResponse, type UpdatePreferencesRequest } from "@account/store/accountApi.gen";
import { builtinAvatarUrl } from "@/shared/utils/avatarUrl";
import { extractErrorMessage } from "@/shared/utils/utils";

export interface UseAccountResult {
  profile: UserProfileResponse | undefined;
  isLoading: boolean;
  error: unknown;

  // Display name — locally editable, saved on demand via PATCH /me.
  displayName: string;
  setDisplayName: (value: string) => void;
  displayNameDirty: boolean;
  saveDisplayName: () => Promise<void>;
  isSavingProfile: boolean;
  profileSuccess: boolean;
  profileError: string | null;

  // Avatar — resolved src for <Avatar>, plus the built-in picker value/handler.
  avatarSrc: string | undefined;
  selectedBuiltinAvatar: string;
  pickBuiltinAvatar: (value: string) => Promise<void>;
  pictureSuccess: boolean;
  pictureError: string | null;
  // TODO: no image-upload endpoint exists on the new UserController yet.
  // Re-wire this once a `POST /api/users/me/avatar` (or similar) lands.
  uploadPicture: (file: File) => Promise<void>;
  isUploading: boolean;

  // Newsletter preference (part of the wholesale preferences PUT).
  newsletter: boolean;
  setNewsletter: (checked: boolean) => Promise<void>;
  newsletterSuccess: boolean;

  // TODO: no account-closure endpoint exists on the new backend yet.
  // Re-wire once a `DELETE /api/users/me` (or equivalent) lands.
  closeAccount: () => Promise<void>;
  isClosing: boolean;
  closeError: string | null;
}

export function useAccount(): UseAccountResult {
  const { data: profile, isLoading, error } = useGetMeQuery();
  const [updateMe, { isLoading: isSavingProfile }] = useUpdateMeMutation();
  const [updatePreferences] = useUpdatePreferencesMutation();

  // --- Display name ----------------------------------------------------------
  // Local draft seeded from the server value; resynced whenever the server
  // value changes (e.g. after a save or a fresh load) so the field reflects
  // the source of truth without clobbering an in-progress edit needlessly.
  const serverDisplayName = profile?.displayName ?? "";
  const [displayName, setDisplayName] = useState(serverDisplayName);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const lastSyncedDisplayName = useRef(serverDisplayName);
  useEffect(() => {
    if (serverDisplayName !== lastSyncedDisplayName.current) {
      lastSyncedDisplayName.current = serverDisplayName;
      setDisplayName(serverDisplayName);
    }
  }, [serverDisplayName]);

  const displayNameDirty = displayName.trim() !== serverDisplayName;

  const saveDisplayName = async () => {
    setProfileError(null);
    setProfileSuccess(false);
    try {
      await updateMe({
        updateProfileRequest: { displayName: displayName.trim() },
      }).unwrap();
      setProfileSuccess(true);
    } catch (err: unknown) {
      setProfileError(
        extractErrorMessage(err, "Could not save your display name."),
      );
    }
  };

  // --- Avatar ----------------------------------------------------------------
  const [pictureSuccess, setPictureSuccess] = useState(false);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const [isUploading] = useState(false);

  const avatar = profile?.avatar;
  // Built-in avatars are stored as an internal id; render them through the same
  // `builtin:<value>` convention <Avatar>/resolveAvatarSrc understands. An
  // external avatar (Google OAuth, uploaded) carries a direct src instead.
  const selectedBuiltinAvatar = avatar?.internalAvatarId ?? "";
  const avatarSrc = avatar?.internalAvatarId
    ? builtinAvatarUrl(avatar.internalAvatarId)
    : (avatar?.externalSrc ?? undefined);

  const pickBuiltinAvatar = async (value: string) => {
    setPictureError(null);
    setPictureSuccess(false);
    try {
      await updateMe({
        updateProfileRequest: { avatar: { internalAvatarId: value } },
      }).unwrap();
      setPictureSuccess(true);
    } catch (err: unknown) {
      setPictureError(extractErrorMessage(err, "Could not update avatar."));
    }
  };

  // TODO: the new UserController has no image-upload route. Surface a clear
  // message until one exists rather than silently doing nothing.
  const uploadPicture = (_file: File): Promise<void> => {
    setPictureError("Uploading a custom picture isn't available yet.");
    setPictureSuccess(false);
    return Promise.resolve();
  };

  // --- Newsletter preference -------------------------------------------------
  // Pending value: null means "use server value"; non-null means the user has
  // toggled it locally (optimistic) ahead of the PUT resolving.
  const [pendingNewsletter, setPendingNewsletter] = useState<boolean | null>(
    null,
  );
  const newsletter =
    pendingNewsletter ?? profile?.preferences?.newsletter ?? false;
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  const setNewsletter = async (checked: boolean) => {
    setPendingNewsletter(checked);
    setNewsletterSuccess(false);
    // PUT preferences is a wholesale replace and the body must be a complete
    // object — Jackson 3 rejects a partial body that omits a primitive
    // (`marketing`/`stayLoggedIn`) with a 400 (BACKEND-RULES #9). Build the full
    // set explicitly with safe defaults rather than spreading a possibly-null
    // `preferences` (it's null until first set), mirroring AccountThemeSection.
    const prefs = profile?.preferences;
    const next: UpdatePreferencesRequest = {
      newsletter: checked,
      marketing: prefs?.marketing ?? false,
      stayLoggedIn: prefs?.stayLoggedIn ?? false,
      theme: prefs?.theme,
    };
    try {
      await updatePreferences({ updatePreferencesRequest: next }).unwrap();
      setNewsletterSuccess(true);
    } catch {
      // Fall back to the server value on failure.
    } finally {
      setPendingNewsletter(null);
    }
  };

  // --- Timezone auto-detect --------------------------------------------------
  // First time we see a profile with no timezone, set it from the browser.
  // Single-shot per mount; we don't retry on failure so a flaky backend can't
  // pin the user in a request loop.
  const hasAttemptedTzDetect = useRef(false);
  useEffect(() => {
    if (!profile?.publicId) return;
    if (profile.timezone) return;
    if (hasAttemptedTzDetect.current) return;
    hasAttemptedTzDetect.current = true;
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!browserTz) return;
    void updateMe({ updateProfileRequest: { timezone: browserTz } })
      .unwrap()
      .catch(() => {
        // Swallow: the read-only display keeps showing "Detecting…"; the user
        // can reload to retry, and nothing else depends on the value yet.
      });
  }, [profile?.publicId, profile?.timezone, updateMe]);

  // --- Danger zone -----------------------------------------------------------
  const [isClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  // TODO: the new UserController has no account-closure route. Surface a clear
  // message until one exists rather than silently doing nothing.
  const closeAccount = (): Promise<void> => {
    setCloseError("Closing your account isn't available yet.");
    return Promise.resolve();
  };

  return {
    profile,
    isLoading,
    error,

    displayName,
    setDisplayName,
    displayNameDirty,
    saveDisplayName,
    isSavingProfile,
    profileSuccess,
    profileError,

    avatarSrc,
    selectedBuiltinAvatar,
    pickBuiltinAvatar,
    pictureSuccess,
    pictureError,
    uploadPicture,
    isUploading,

    newsletter,
    setNewsletter,
    newsletterSuccess,

    closeAccount,
    isClosing,
    closeError,
  };
}
