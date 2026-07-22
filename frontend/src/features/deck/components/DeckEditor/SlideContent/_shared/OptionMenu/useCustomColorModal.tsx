/**
 * Opens the shared "Custom color" modal for an option/item/card color — the
 * DS color picker's custom view (saturation field, hue/alpha sliders, hex
 * input) hosted in the app modal, which supplies the title and close chrome.
 * Used by every OptionMenuContent consumer's "custom color" chip.
 *
 * The current color seeds the editor (hex overrides and oklch palette
 * defaults both parse; only Apply commits, handing back a hex string). The
 * Theme row offers the curated theme roles as starting points, and commits
 * are recorded in the app-wide recent-colors list.
 */
import { ColorPickerPanel } from "@components/Forms/Input/ColorPicker/ColorPickerPanel";
import type { ColorValue } from "@components/Forms/Input/ColorPicker/ColorPickerPanel";
import { addRecentColor, useRecentColors } from "@hooks/useRecentColors";
import { useModal } from "@hooks/useModal";
import { THEME_COLOR_ROLES } from "@utils/roleColors";

const THEME_SWATCHES: ColorValue[] = THEME_COLOR_ROLES.map(
  (role) => role.cssVar as ColorValue,
);

type OpenCustomColorModal = (
  currentColor: string,
  onPick: (color: string) => void,
) => void;

export function useCustomColorModal(): OpenCustomColorModal {
  const { openModal, closeModal } = useModal();
  const recentColors = useRecentColors();

  return (currentColor, onPick) => {
    openModal({
      title: "Custom color",
      content: (
        <ColorPickerPanel
          value={currentColor}
          initialView="custom"
          showHeader={false}
          colorSwatch={THEME_SWATCHES}
          recentlyUsedColorSwatch={recentColors}
          onChange={(next) => {
            onPick(next);
            addRecentColor(next);
          }}
          onClose={closeModal}
        />
      ),
    });
  };
}
