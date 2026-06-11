// A row of swatch buttons for the active theme's palette colors (the curated
// subset in shared/utils/roleColors.ts). Each swatch both displays and stores a
// live `var(--role-*)` reference: it renders inside the themed subtree, so the
// CSS cascade paints the swatch with the current theme's color, and the same
// string is handed to `onPick` to persist. No color resolution needed.
import { ColorOptionBtn } from "@ui/Buttons/ColorOptionBtn";
import { THEME_COLOR_ROLES } from "@utils/roleColors";

interface ThemeColorSwatchesProps {
  /** Receives the picked role's CSS value, e.g. "var(--role-accent)". */
  onPick?: (value: string) => void;
  /** Suppress mousedown focus-steal (for toolbars floating over an editor). */
  preventFocusSteal?: boolean;
}

const ThemeColorSwatches = ({
  onPick,
  preventFocusSteal,
}: ThemeColorSwatchesProps) => (
  <>
    {THEME_COLOR_ROLES.map((r) => (
      <ColorOptionBtn
        key={r.role}
        label={r.label}
        color={r.cssVar}
        preventFocusSteal={preventFocusSteal}
        onClick={onPick ? () => onPick(r.cssVar) : undefined}
      />
    ))}
  </>
);

export { ThemeColorSwatches };
