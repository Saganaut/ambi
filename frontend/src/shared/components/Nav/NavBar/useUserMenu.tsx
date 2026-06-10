// Auth and avatar logic for the UserMenu component.
import { type JSX, useState } from "react";

import { UserCircleIcon } from "@heroicons/react/24/solid";

import styles from "./NavBar.module.css";
import { useAuthActions } from "@auth/hooks/useAuthActions";
import { useSessionUser } from "@auth/hooks/useCurrentUser";
import { useGetMeQuery } from "@auth/store/userApi.gen";
import { Avatar } from "@ui/Avatar/Avatar";
import { resolveProfileAvatarSrc } from "@/shared/utils/avatarUrl";

interface useUserMenuResponse {
  handleLogin: () => void;
  handleLogout: () => Promise<void>;
  handleGuestLogin: () => Promise<void>;
  avatarContent: () => JSX.Element;
  setGuestName: React.Dispatch<React.SetStateAction<string>>;
  guestError: string | null;
  guestLoading: boolean;
  showGuestInput: boolean;
  setShowGuestInput: React.Dispatch<React.SetStateAction<boolean>>;
  guestName: string;
}

const useUserMenu = (): useUserMenuResponse => {
  const [guestName, setGuestName] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [showGuestInput, setShowGuestInput] = useState(false);

  const { login, logout, createGuest, isCreatingGuest } = useAuthActions();
  const userState = useSessionUser();
  // Only the session-backed states (registered/guest) carry a profile payload;
  // for everyone else `userState` is undefined and `avatarContent` falls back
  // to the generic icon.
  const me = userState?.me;

  // The avatar lives on the full self profile (`/api/users/me`), which is
  // registered-only — guests get a 403, so skip and fall back to the initial.
  // The profile-mutation cache sync (enhancements/user) keeps this entry
  // fresh, so an avatar change reflects here immediately.
  const { data: profile } = useGetMeQuery(undefined, {
    skip: userState?.state !== "registered",
  });

  const handleLogin = () => {
    login();
  };

  const handleLogout = logout;

  // NOTE: `POST /api/auth/guest` no longer takes a chosen name — a guest's
  // ephemeral identity is minted server-side. The guestName input + validation
  // below is vestigial UI pending the live-session join rework (deferred);
  // we mint the guest regardless of the typed name and let useAuthActions
  // reload on success. A rejected mint stays put so we can show the error.
  const handleGuestLogin = async () => {
    setGuestError(null);
    try {
      await createGuest();
    } catch {
      setGuestError("Unable to create guest session. Please try again.");
    }
  };

  const avatarContent = () => {
    const label = me?.displayName ?? me?.username;
    const src = resolveProfileAvatarSrc(profile?.avatar);
    if (src) {
      return <Avatar src={src} name={label} alt='Your avatar' size='sm' />;
    }
    if (label) {
      return (
        <div className={styles.avatarInitial}>{label[0].toUpperCase()}</div>
      );
    }
    return <UserCircleIcon className={styles.avatarIcon} />;
  };

  return {
    handleGuestLogin,
    handleLogin,
    handleLogout,
    setGuestName,
    guestError,
    guestLoading: isCreatingGuest,
    showGuestInput,
    avatarContent,
    setShowGuestInput,
    guestName,
  };
};

export { useUserMenu };
