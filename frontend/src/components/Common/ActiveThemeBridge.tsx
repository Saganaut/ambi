/**
 * Mounted once near the root of the app. Drives the document theme/hue from
 * the server's `activeThemeId` via useActiveThemeSync. The hook handles the
 * RTK Query reads + the application; this component only exists to anchor it
 * inside the React tree.
 */
import { useActiveThemeSync } from "@/hooks/useActiveThemeSync";

const ActiveThemeBridge = () => {
  useActiveThemeSync();
  return null;
};

export { ActiveThemeBridge };
