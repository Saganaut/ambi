// The curated subset of theme palette roles offered in the color pickers (MCQ
// option color, rich-text color). Each is a live `var(--role-*)` reference, so a
// picked value tracks whatever theme paints the surface — the deck theme inside
// the slide canvas / live session, the global theme elsewhere. Surfaces and
// borders are intentionally omitted: they read poorly as text/option colors.
//
// The var names mirror the --role-* mapping in shared/utils/applyPalette.ts.

export interface ThemeColorRole {
  /** Palette role key (matches the Palette type / applyPalette ROLE_VARS). */
  role: string;
  /** Short label for the swatch tooltip. */
  label: string;
  /** The CSS value stored + displayed; resolves live via the cascade. */
  cssVar: string;
}

export const THEME_COLOR_ROLES: ThemeColorRole[] = [
  { role: "foreground", label: "Text", cssVar: "var(--role-foreground)" },
  { role: "mutedForeground", label: "Muted", cssVar: "var(--role-muted-foreground)" },
  { role: "primary", label: "Primary", cssVar: "var(--role-primary)" },
  { role: "accent", label: "Accent", cssVar: "var(--role-accent)" },
  { role: "accentSecondary", label: "Accent 2", cssVar: "var(--role-accent-secondary)" },
  { role: "red", label: "Red", cssVar: "var(--role-red)" },
  { role: "green", label: "Green", cssVar: "var(--role-green)" },
  { role: "yellow", label: "Yellow", cssVar: "var(--role-yellow)" },
  { role: "blue", label: "Blue", cssVar: "var(--role-blue)" },
];
