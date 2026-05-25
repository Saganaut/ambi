/**
 * Hook for reading and controlling app-level fullscreen mode. Read
 * `isFullScreen` for conditional styling; call `enterFullScreen`,
 * `exitFullScreen`, or `toggleFullScreen` from a button handler.
 *
 * Users can always exit via ESC or the floating X button rendered by
 * LayoutProvider — pages don't need to render their own exit control.
 */
import { use } from "react";
import { LayoutContext, type LayoutContextValue } from "./LayoutProvider";

const useFullScreen = (): LayoutContextValue => {
  const ctx = use(LayoutContext);
  if (!ctx) {
    throw new Error("useFullScreen must be used within a LayoutProvider");
  }
  return ctx;
};

export { useFullScreen };
