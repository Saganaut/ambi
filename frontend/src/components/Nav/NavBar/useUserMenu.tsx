// Auth and avatar logic for the UserMenu component.
import { type JSX, useState } from "react";

import { UserCircleIcon } from "@heroicons/react/24/solid";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { useRequireLogin } from "../../../hooks/useRequireLogin";
import { useTheme, type ThemeMode } from "../../../hooks/useTheme";
import {
  useCreateGuestMutation,
  useLogoutMutation,
} from "../../../store/AmbiApi";
import styles from "./NavBar.module.css";

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
  const [createGuest, { isLoading: guestLoading }] = useCreateGuestMutation();
  const [logout] = useLogoutMutation();
  const [showGuestInput, setShowGuestInput] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const userState = useCurrentUser();
  // Only the session-backed states carry a profile payload.
  const me =
    userState.state === "registered" || userState.state === "guest"
      ? userState.me
      : undefined;
  const { openLoginModal } = useRequireLogin();

  const handleLogin = () => {
    openLoginModal();
  };

  // Goes through the RTK mutation (not a raw fetch) so the base query attaches
  // the X-XSRF-TOKEN header — the backend rejects an unguarded POST /logout with
  // 403. The session is revoked server-side instantly; a full reload clears all
  // cached auth state.
  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } finally {
      window.location.reload();
    }
  };

  // NOTE: `POST /api/auth/guest` no longer takes a chosen name — a guest's
  // ephemeral identity is minted server-side. The guestName input + validation
  // below is vestigial UI pending the live-session join rework (deferred);
  // we mint the guest and reload regardless of the typed name.
  const handleGuestLogin = async () => {
    setGuestError(null);
    try {
      await createGuest().unwrap();
      window.location.reload();
    } catch {
      setGuestError("Unable to create guest session. Please try again.");
    }
  };

  const avatarContent = () => {
    const label = me?.displayName ?? me?.username;
    if (label) {
      return <div className={styles.avatarInitial}>{label[0].toUpperCase()}</div>;
    }
    return <UserCircleIcon className={styles.avatarIcon} />;
  };

  return {
    handleGuestLogin,
    handleLogin,
    handleLogout,
    setGuestName,
    guestError,
    guestLoading,
    showGuestInput,
    theme,
    toggleTheme,
    avatarContent,
    setShowGuestInput,
    guestName,
  };
};

export { useUserMenu };
