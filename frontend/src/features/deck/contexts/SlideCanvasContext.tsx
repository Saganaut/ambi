import { createContext, type ReactNode } from "react";

/**
 * Canvas-level chrome state that the kind-specific slide editors shouldn't have
 * to thread by hand. Right now that's just whether the canvas is painting a
 * background image — {@link SlideWrapper} reads it to decide whether the
 * prompt header needs its contrast glow (legible text over a busy image), so the
 * decision lives in one place instead of being duplicated per content type.
 */
export interface SlideCanvasContextValue {
  /** True when the canvas is currently painting a background image. */
  hasBackgroundImage: boolean;
}

// Default for when there's no provider above (e.g. a SlideWrapper rendered
// in isolation, Storybook/tests): no background image, so no glow.
const SlideCanvasContext = createContext<SlideCanvasContextValue>({
  hasBackgroundImage: false,
});

const SlideCanvasProvider = ({
  hasBackgroundImage,
  children,
}: {
  hasBackgroundImage: boolean;
  children: ReactNode;
}) => (
  <SlideCanvasContext.Provider value={{ hasBackgroundImage }}>
    {children}
  </SlideCanvasContext.Provider>
);

export { SlideCanvasContext, SlideCanvasProvider };
