// Auth and avatar logic for the UserMenu component
import { type JSX, useState } from "react";

import { UserCircleIcon } from "@heroicons/react/24/solid";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { useRequireLogin } from "../../../hooks/useRequireLogin";
import { useTheme, type ThemeMode } from "../../../hooks/useTheme";
import { useGuestLoginMutation } from "../../../store/BrainFlexApi";
import { apiBaseUrl } from "../../../store/emptyApi";
import { resolveAvatarSrc } from "../../../utils/avatarUrl";
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
  const [guestLogin, { isLoading: guestLoading }] = useGuestLoginMutation();
  const [showGuestInput, setShowGuestInput] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const userState = useCurrentUser();
  const user =
    userState.state === "registered" || userState.state === "guest"
      ? userState.user
      : undefined;
  const { openLoginModal } = useRequireLogin();

  const handleLogin = () => {
    openLoginModal();
  };

  const handleLogout = async () => {
    console.log("Logging out");
    await fetch(`${apiBaseUrl}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    window.location.reload();
  };

  const handleGuestLogin = async () => {
    setGuestError(null);
    const trimmedName = guestName.trim();

    if (trimmedName.length < 3 || trimmedName.length > 20) {
      setGuestError("Username must be between 3 and 20 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedName)) {
      setGuestError("Letters, numbers, and underscores only.");
      return;
    }

    try {
      await guestLogin({
        guestLoginRequest: { username: trimmedName },
      }).unwrap();
      window.location.reload();
    } catch {
      setGuestError("Unable to create guest session. Try another name.");
    }
  };

  const avatarContent = () => {
    if (user?.pictureUrl) {
      return <img src={resolveAvatarSrc(user.pictureUrl)} alt={user.userName} />;
    }
    if (user?.userName) {
      return (
        <div className={styles.avatarInitial}>
          {user.userName[0].toUpperCase()}
        </div>
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
