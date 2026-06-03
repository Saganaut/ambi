/**
 * App-level layout coordinator. Owns `isFullScreen` state and exposes it via
 * `useFullScreen()`. Components that need to react to fullscreen mode (hide
 * the nav, expand a canvas, etc.) subscribe to the flag and toggle their own
 * style classes in their own stylesheet — there is no global CSS hook here.
 *
 * Two escape hatches are always provided so users can't get stuck: ESC exits,
 * and a floating X button rendered top-right (only while fullscreen) clicks
 * to exit.
 */
import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ArrowsPointingInIcon } from "@heroicons/react/24/outline";
import styles from "./LayoutProvider.module.css";

interface LayoutContextValue {
  isFullScreen: boolean;
  enterFullScreen: () => void;
  exitFullScreen: () => void;
  toggleFullScreen: () => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

const LayoutProvider = ({ children }: { children: ReactNode }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const enterFullScreen = useCallback(() => {
    setIsFullScreen(true);
  }, []);
  const exitFullScreen = useCallback(() => {
    setIsFullScreen(false);
  }, []);
  const toggleFullScreen = useCallback(() => {
    setIsFullScreen((v) => !v);
  }, []);

  useEffect(() => {
    if (!isFullScreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullScreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullScreen]);

  return (
    <LayoutContext
      value={{
        isFullScreen,
        enterFullScreen,
        exitFullScreen,
        toggleFullScreen,
      }}>
      {children}
      {isFullScreen && (
        <button
          type='button'
          className={styles.exitButton}
          aria-label='Exit fullscreen'
          onClick={exitFullScreen}>
          <ArrowsPointingInIcon className={styles.exitIcon} />
        </button>
      )}
    </LayoutContext>
  );
};

export { LayoutContext, LayoutProvider };
export type { LayoutContextValue };
