// Wraps a subtree in a deck's theme without affecting layout. It resolves the
// deck theme (via useDeckTheme) and sets the --role-* vars + data-appearance on
// a `display: contents` element, so the custom properties cascade into the
// children while the wrapper itself produces no box. When the deck has no theme
// the children simply inherit the global theme.
//
// Used for the whole-screen live-session surface. (The deck editor canvas merges
// the same vars onto its existing canvas element instead — see SlideDisplay.)
import type { CSSProperties, ReactNode } from "react";
import { useDeckTheme } from "@features/theme/hooks/useDeckTheme";

interface DeckThemeScopeProps {
  themeId?: string;
  children: ReactNode;
}

const DeckThemeScope = ({ themeId, children }: DeckThemeScopeProps) => {
  const { style, appearance } = useDeckTheme(themeId);

  return (
    <div
      style={{ display: "contents", ...style } as CSSProperties}
      data-appearance={appearance}
    >
      {children}
    </div>
  );
};

export { DeckThemeScope };
