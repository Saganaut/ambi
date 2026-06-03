// Auth and avatar logic for the UserMenu component.
import { type JSX, useState } from "react";

import { UserCircleIcon } from "@heroicons/react/24/solid";

import { useTheme, type ThemeMode } from "@hooks/useTheme";
import styles from "./NavBar.module.css";
import { useAuthActions } from "@auth/hooks/useAuthActions";
import { useSessionUser } from "@auth/hooks/useCurrentUser";

interface useUserMenuResponse {
  handleLogin: () => void;
  handleLogout: () => Promise<void>;
  handleGuestLogin: () => Promise<void>;
  avatarContent: () => JSX.Element;
  setGuestName: React.Dispatch<React.SetStateAction<string>>;
  guestError: string | null;
  guestLoading: boolean;
  showGuestInput: boolean;
  theme: ThemeMode;
  toggleTheme: () => void;
  setShowGuestInput: React.Dispatch<React.SetStateAction<boolean>>;
  guestName: string;
}

const useUserMenu = (): useUserMenuResponse => {
  const [guestName, setGuestName] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [showGuestInput, setShowGuestInput] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { login, logout, createGuest, isCreatingGuest } = useAuthActions();
  const userState = useSessionUser();
  // Only the session-backed states (registered/guest) carry a profile payload;
  // for everyone else `userState` is undefined and `avatarContent` falls back
  // to the generic icon.
  const me = userState?.me;

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
    theme,
    toggleTheme,
    avatarContent,
    setShowGuestInput,
    guestName,
  };
};

export { useUserMenu };
