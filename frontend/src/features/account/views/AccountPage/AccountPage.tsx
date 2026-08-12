// Account settings dashboard. Tabs split unrelated concerns (profile, theme,
// organizations, danger zone) so the page doesn't grow into a single long
// scrolling form as we add settings.
//
// This component is pure UI: all state, mutations, and side effects live in
// `useAccount`. It only renders what the hook exposes and forwards events back.
import { Avatar } from "@ui/Avatar/Avatar";
import { Btn } from "@saganaut/ambi-ui";
import { Checkbox } from "@components/Forms/Input/Checkbox/Checkbox";
import { Tabs } from "@ui/Tabs/Tabs";
import { useAvatarPicker } from "@hooks/useAvatarPicker";
import { useState } from "react";
import styles from "./AccountPage.module.css";
import { useAccount } from "../../useAccount";
import { AccountThemeSection } from "./AccountThemeSection";
import { GallerySection } from "./GallerySection";
import { Input } from "@/shared/components/Forms/Input/Input/Input";
import { authValidation } from "@/features/auth/store/authValidationConstants";
import { validateText } from "@utils/fieldValidation";
type Tab =
  | "profile"
  | "theme"
  | "gallery"
  | "organizations"
  | "achievements"
  | "danger";

const AccountPage = () => {
  // The /_authenticated layout route guarantees a registered session by the
  // time this component renders — it redirects everyone else home.
  const account = useAccount();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const openAvatarPicker = useAvatarPicker();

  const {
    profile,
    isLoading,
    displayName,
    setDisplayName,
    displayNameDirty,
    saveDisplayName,
    isSavingProfile,
    profileSuccess,
    profileError,
    avatarSrc,
    selectedBuiltinAvatar,
    applyAvatarPick,
    pictureSuccess,
    pictureError,
    newsletter,
    setNewsletter,
    newsletterSuccess,
    closeAccount,
    isClosing,
    closeError,
  } = account;

  if (isLoading || !profile) return null;

  // Client-side mirror of the backend UpdateProfileRequest.displayName bound
  // (sourced from validationConstants); the server stays authoritative.
  const displayNameError = validateText(
    displayName,
    authValidation.UpdateProfileRequest.displayName,
    { required: true, label: "Display name" },
  );

  const profilePanel = (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Profile Picture</h2>
        <Avatar
          src={avatarSrc}
          name={profile.displayName ?? profile.username}
          alt='Profile picture'
          size='xl'
        />
        <Btn
          onClick={() => {
            openAvatarPicker((pick) => void applyAvatarPick(pick), {
              title: "Change avatar",
              builtinValue: selectedBuiltinAvatar,
            });
          }}>
          Change avatar
        </Btn>
        {pictureSuccess && (
          <p className={styles.success}>Profile picture updated.</p>
        )}
        {pictureError && <p className={styles.error}>{pictureError}</p>}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Display Name</h2>
        <Input
          ariaLabel='Display name'
          value={displayName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setDisplayName(e.target.value);
          }}
          maxLength={authValidation.UpdateProfileRequest.displayName.maxLength}
          errorMessage={displayNameError ?? undefined}
          placeholder='Your display name'
        />
        <Btn
          onClick={() => void saveDisplayName()}
          isDisabled={!displayNameDirty || isSavingProfile || displayNameError != null}>
          {isSavingProfile ? "Saving..." : "Save"}
        </Btn>
        {profileSuccess && (
          <p className={styles.success}>Display name saved.</p>
        )}
        {profileError && <p className={styles.error}>{profileError}</p>}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Newsletter</h2>
        <label className={styles.checkboxLabel}>
          <Checkbox
            checked={newsletter}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              void setNewsletter(e.target.checked);
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
            <dt className={styles.infoLabel}>Username</dt>
            <dd className={styles.infoValue}>{profile.username ?? "—"}</dd>
          </div>
          <div className={styles.infoRow}>
            <dt className={styles.infoLabel}>Email</dt>
            <dd className={styles.infoValue}>{profile.email ?? "—"}</dd>
          </div>
          <div className={styles.infoRow}>
            <dt className={styles.infoLabel}>Timezone</dt>
            <dd className={styles.infoValue}>
              {profile.timezone ?? "Detecting…"}
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
        onClick={() => void closeAccount()}
        isDisabled={isClosing}>
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
          { id: "theme", label: "Theme", panel: <AccountThemeSection /> },
          {
            id: "gallery",
            label: "Gallery",
            panel: <GallerySection />,
          },
          {
            id: "organizations",
            label: "Organizations",
            panel: <div>Org section to be implemented</div>,
          },
          {
            id: "achievements",
            label: "Achievements",
            panel: <div>Achievements Section </div>,
          },
          { id: "danger", label: "Danger zone", panel: dangerPanel },
        ]}
      />
    </div>
  );
};

export { AccountPage };
