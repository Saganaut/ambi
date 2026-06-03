// Standalone light/dark theme toggle for the NavBar. Lives outside the
// UserMenu so it stays reachable for every auth state — the menu now collapses
// to a plain Log in button for unauthenticated users, which previously was the
// only home for this control.
import { IconBtn } from "@common/Buttons/IconBtn";
import SunIcon from "@assets/icons/theme/sun.svg?react";
import MoonIcon from "@assets/icons/theme/moon.svg?react";
import { useTheme } from "@hooks/useTheme";

import styles from "./NavBar.module.css";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <IconBtn
      variant='primary'
      fill='ghost'
      size='md'
      aria-label='Toggle theme'
      onClick={toggleTheme}
      icon={
        <span className={styles.themeToggle} aria-hidden='true'>
          <SunIcon
            className={
              theme === "dark" ? styles.themeIconActive : styles.themeIconHidden
            }
          />
          <MoonIcon
            className={
              theme === "light"
                ? styles.themeIconActive
                : styles.themeIconHidden
            }
          />
        </span>
      }
    />
  );
};

export { ThemeToggle };
