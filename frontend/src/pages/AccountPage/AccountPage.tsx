// Account settings dashboard. Tabs split unrelated concerns (profile, theme,
// organizations, danger zone) so the page doesn't grow into a single long
// scrolling form as we add settings.
import { useEffect, useRef, useState } from "react";
import {
  useCloseAccountMutation,
  useGetCurrentUserQuery,
  useUpdateProfileMutation,
  useUploadProfileImageMutation,
} from "../../store/BrainFlexApi";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { apiBaseUrl } from "../../store/emptyApi";
import { ThemeSection } from "./ThemeSection";
import { OrgSection } from "./OrgSection";
import { GallerySection } from "./GallerySection";
import { AchievementsSection } from "./AchievementsSection";
import styles from "./AccountPage.module.css";
import { Btn } from "@components/Common/Buttons/Btn";
import { Checkbox } from "@/components/Common/Input/Checkbox/Checkbox";
import { Tabs } from "@/components/Common/Tabs/Tabs";
import { FileUpload } from "@/components/Common/Input/FileUpload/FileUpload";
import { Avatar } from "@/components/Common/Avatar/Avatar";
import { AvatarSelector } from "@/components/Common/Input/AvatarSelector/AvatarSelector";
import { useConfirm } from "@/components/Common/ConfirmDialog/useConfirm";
import { validateImageFile } from "@/utils/imageValidation";
import {
  builtinAvatarUrl,
  builtinAvatarValue,
} from "@/utils/avatarUrl";
import { extractErrorMessage } from "@/utils/utils";

type Tab =
  | "profile"
  | "theme"
  | "gallery"
  | "organizations"
  | "achievements"
  | "danger";

const AccountPage = () => {
  // The /_authenticated layout route guarantees userState.state === "registered"
  // by the time this component renders — it redirects everyone else home.
  const userState = useCurrentUser();
  const { refetch } = useGetCurrentUserQuery();

  const registeredUser =
    userState.state === "registered" ? userState.user : null;

  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const [pictureSuccess, setPictureSuccess] = useState(false);
  const [pictureError, setPictureError] = useState<string | null>(null);

  // Pending newsletter value: null means "use server value"; non-null means
  // the user has toggled it locally (optimistic update before the API responds).
  const [pendingNewsletter, setPendingNewsletter] = useState<boolean | null>(
    null,
  );
  const newsletter = pendingNewsletter ?? registeredUser?.newsletter ?? false;
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  const [closeError, setCloseError] = useState<string | null>(null);

  const [updateProfile] = useUpdateProfileMutation();
  const [uploadProfileImage, { isLoading: isUploading }] =
    useUploadProfileImageMutation();
  const [closeAccount, { isLoading: isClosing }] = useCloseAccountMutation();
  const confirm = useConfirm();

  // Auto-detect the browser timezone the first time we see a registered user
  // without one set. Single-shot per page mount; we don't retry if the PATCH
  // fails so a flaky backend can't pin the user in a request loop.
  const hasAttemptedTzDetect = useRef(false);
  useEffect(() => {
    if (!registeredUser?.id) return;
    if (registeredUser.timezone) return;
    if (hasAttemptedTzDetect.current) return;
    hasAttemptedTzDetect.current = true;
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!browserTz) return;
    void updateProfile({ updateProfileRequest: { timezone: browserTz } })
      .unwrap()
      .then(() => refetch())
      .catch(() => {
        // Swallow: read-only display will keep showing "Detecting…". The user
        // can reload to retry, and the field is not load-bearing for anything else yet.
      });
  }, [registeredUser?.id, registeredUser?.timezone, updateProfile, refetch]);

  if (!registeredUser) return null;

  // FileUpload returns the full accumulated list each change; treat the most
  // recent entry as the chosen file so re-picking replaces the previous one.
  const handleFiles = async (files: File[]) => {
    const file = files.at(-1);
    if (!file) return;

    setPictureError(null);
    setPictureSuccess(false);

    const validationError = validateImageFile(file, "avatar");
    if (validationError) {
      setPictureError(validationError);
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      await uploadProfileImage({
        body: formData as unknown as { image: Blob },
      }).unwrap();
      setPictureSuccess(true);
      await refetch();
    } catch (err: unknown) {
      setPictureError(extractErrorMessage(err, "Upload failed. Please try again."));
    }
  };

  // Built-in avatar pick. Stored as `builtin:<value>` in pictureUrl; the
  // backend clears pictureVariants on its end so the selection actually wins
  // the hydrator's variants>pictureUrl precedence.
  const handleAvatarPick = async (avatarValue: string) => {
    setPictureError(null);
    setPictureSuccess(false);
    try {
      await updateProfile({
        updateProfileRequest: { pictureUrl: builtinAvatarUrl(avatarValue) },
      }).unwrap();
      setPictureSuccess(true);
      await refetch();
    } catch (err: unknown) {
      setPictureError(extractErrorMessage(err, "Could not update avatar."));
    }
  };

  const selectedBuiltinAvatar =
    builtinAvatarValue(registeredUser.pictureUrl) ?? "";

  const handleNewsletterChange = async (checked: boolean) => {
    setPendingNewsletter(checked);
    setNewsletterSuccess(false);
    try {
      await updateProfile({
        updateProfileRequest: { newsletter: checked },
      }).unwrap();
      setNewsletterSuccess(true);
      await refetch();
      setPendingNewsletter(null);
    } catch {
      setPendingNewsletter(null);
    }
  };

  const handleCloseAccount = async () => {
    const ok = await confirm({
      title: "Close account",
      message: "Are you sure? This cannot be undone.",
      confirmLabel: "Close my account",
      variant: "danger",
    });
    if (!ok) return;
    setCloseError(null);
    try {
      await closeAccount().unwrap();
      await fetch(`${apiBaseUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/";
    } catch {
      setCloseError("Failed to close account. Please try again.");
    }
  };

  const profilePanel = (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Profile Picture</h2>
        <Avatar
          src={registeredUser.pictureUrl}
          name={registeredUser.userName ?? registeredUser.name}
          alt='Profile picture'
          size='xl'
        />
        <FileUpload
          accept='image/jpeg,image/png,image/webp,image/gif'
          onChange={(files) => {
            void handleFiles(files);
          }}
          infoMessage={
            isUploading
              ? "Uploading..."
              : "JPEG, PNG, WebP or GIF · max 1 MB · resized to 500×500"
          }
          errorMessage={pictureError ?? undefined}
        />
        <AvatarSelector
          name='profile-avatar'
          legend='Or pick a built-in avatar'
          value={selectedBuiltinAvatar}
          onChange={(v) => {
            void handleAvatarPick(v);
          }}
        />
        {pictureSuccess && (
          <p className={styles.success}>Profile picture updated.</p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Newsletter</h2>
        <label className={styles.checkboxLabel}>
          <Checkbox
            checked={newsletter}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              void handleNewsletterChange(e.target.checked);
            }}
          />
          Receive newsletter emails
        </label>
        {newsletterSuccess && (
          <p className={styles.success}>Preference saved.</p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Account info</h2>
        <dl className={styles.infoList}>
          <div className={styles.infoRow}>
            <dt className={styles.infoLabel}>Timezone</dt>
            <dd className={styles.infoValue}>
              {registeredUser.timezone ?? "Detecting…"}
            </dd>
          </div>
          <div className={styles.infoRow}>
            <dt className={styles.infoLabel}>Email verified</dt>
            <dd className={styles.infoValue}>
              {registeredUser.emailVerifiedAt
                ? new Date(registeredUser.emailVerifiedAt).toLocaleDateString(
                    undefined,
                    { year: "numeric", month: "short", day: "numeric" },
                  )
                : "Not yet verified"}
            </dd>
          </div>
        </dl>
      </section>
    </>
  );

  const dangerPanel = (
    <section className={`${styles.section} ${styles.dangerSection}`}>
      <h2 className={styles.sectionTitle}>Close Account</h2>
      <p className={styles.dangerText}>
        Closing your account is permanent. Your account will be deactivated and
        you will be logged out.
      </p>
      <Btn
        className={styles.dangerBtn}
        onClick={() => void handleCloseAccount()}
        disabled={isClosing}>
        {isClosing ? "Closing..." : "Close my account"}
      </Btn>
      {closeError && <p className={styles.error}>{closeError}</p>}
    </section>
  );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Account Settings</h1>

      <Tabs
        ariaLabel='Account settings'
        value={activeTab}
        onChange={(id) => {
          setActiveTab(id as Tab);
        }}
        items={[
          { id: "profile", label: "Profile", panel: profilePanel },
          { id: "theme", label: "Theme", panel: <ThemeSection /> },
          { id: "gallery", label: "Gallery", panel: <GallerySection /> },
          {
            id: "organizations",
            label: "Organizations",
            panel: <OrgSection />,
          },
          {
            id: "achievements",
            label: "Achievements",
            panel: <AchievementsSection />,
          },
          { id: "danger", label: "Danger zone", panel: dangerPanel },
        ]}
      />
    </div>
  );
};

export { AccountPage };
