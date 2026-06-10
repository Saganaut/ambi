// Mounts the global-theme side-effect once at the app root. Renders nothing —
// it exists so applying the user's palette to <html> doesn't piggyback on some
// incidental component (the NavBar) staying mounted.
import { useTheme } from "@hooks/useTheme";

const ThemeBridge = (): null => {
  useTheme();
  return null;
};

export { ThemeBridge };
