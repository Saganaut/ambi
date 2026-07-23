/**
 * The option menu's "Custom color" view — the DS color picker's custom view
 * (saturation field, hue/alpha sliders, hex input) wired to the curated theme
 * roles and the app-wide recent-colors list. Hosted in the same
 * FloatingPopover as `OptionMenuContent` (per the DS popover design, Figma
 * 603-2718): the back chevron returns to the menu, and only Apply commits —
 * handing back a hex string and recording it in the recent-colors list.
 *
 * The current color seeds the editor (hex overrides and oklch palette
 * defaults both parse), and the Theme row offers the curated theme roles as
 * starting points.
 */
import { useEffect, useRef } from "react";

import { ColorPickerPanel } from "@components/Forms/Input/ColorPicker/ColorPickerPanel";
import type { ColorValue } from "@components/Forms/Input/ColorPicker/ColorPickerPanel";
import { addRecentColor, useRecentColors } from "@hooks/useRecentColors";
import { THEME_COLOR_ROLES } from "@utils/roleColors";

const THEME_SWATCHES: ColorValue[] = THEME_COLOR_ROLES.map(
  (role) => role.cssVar as ColorValue,
);

interface CustomColorPanelProps {
  /** The option's current color — seeds the editor. */
  value: string;
  /** Fired when Apply commits a color (hex string). */
  onPick: (color: string) => void;
  /** Return to the option menu view, keeping the popover open. */
  onBack: () => void;
  /** Close the hosting popover — fired by X, Cancel, and after Apply. */
  onClose: () => void;
}

const CustomColorPanel = ({ value, onPick, onBack, onClose }: CustomColorPanelProps) => {
  const recentColors = useRecentColors();
  const rootRef = useRef<HTMLDivElement>(null);

  // The host swaps this panel in for the menu, unmounting the chip that held
  // focus; land focus on the header's back control (the panel's first button)
  // so keyboard and screen-reader users stay inside the relabelled dialog.
  useEffect(() => {
    rootRef.current?.querySelector("button")?.focus();
  }, []);

  return (
    // The menu view names its dialog itself (OptionMenuContent's Popover);
    // this view mirrors that so the swap re-announces as "Custom color".
    <div ref={rootRef} role="dialog" aria-label="Custom color">
      <ColorPickerPanel
        value={value}
        initialView="custom"
        colorSwatch={THEME_SWATCHES}
        recentlyUsedColorSwatch={recentColors}
        onBack={onBack}
        onChange={(next) => {
          onPick(next);
          addRecentColor(next);
        }}
        onClose={onClose}
      />
    </div>
  );
};

export { CustomColorPanel };
