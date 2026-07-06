// Free-range color picker for the shared modal: a saturation/value square,
// a hue slider, and a hex field, applied only on the explicit Apply click so
// dragging around never half-commits a color. Built on the @uiw/react-color
// Saturation/Hue primitives (same family as the Block/Swatch pickers here).
//
// The incoming color may be hex, an oklch() palette default, or a live
// var(--role-*) theme reference. Only the first two carry a recoverable hue,
// so anything else falls back to a neutral grey starting point. Applying
// always hands back a plain hex string.
import { hexToHsva, hsvaToHex, type HsvaColor } from "@uiw/color-convert";
import { Hue, Saturation } from "@uiw/react-color";
import { useState } from "react";

import { Btn } from "@ui/Buttons/Btn";
import { Input } from "@components/Forms/Input/Input/Input";
import { hueToHex, isHexColor, parseHue } from "@utils/color";
import styles from "./ColorPicker.module.css";

const FALLBACK_HEX = "#888888";

/** Best-effort hex for the picker's starting point (see file header). */
const toStartingHex = (color: string): string => {
  if (isHexColor(color)) return color;
  if (color.trim().startsWith("oklch")) return hueToHex(parseHue(color));
  return FALLBACK_HEX;
};

interface CustomColorPickerProps {
  /** The current color the picker starts from. */
  initialColor: string;
  /** Fired with the picked hex on Apply; the opener closes the modal. */
  onApply: (hex: string) => void;
}

const CustomColorPicker = ({ initialColor, onApply }: CustomColorPickerProps) => {
  const [hsva, setHsva] = useState<HsvaColor>(() =>
    hexToHsva(toStartingHex(initialColor)),
  );
  // The hex field mirrors the picker but tolerates in-progress typing; only
  // a well-formed 6-digit hex is folded back into the picker state.
  const [hexField, setHexField] = useState(() => hsvaToHex(hexToHsva(toStartingHex(initialColor))));

  const updateColor = (next: HsvaColor) => {
    setHsva(next);
    setHexField(hsvaToHex(next));
  };

  const handleHexInput = (value: string) => {
    setHexField(value);
    const normalized = value.startsWith("#") ? value : `#${value}`;
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      setHsva(hexToHsva(normalized));
    }
  };

  const pickedHex = hsvaToHex(hsva);

  return (
    <div className={styles.customPicker}>
      <Saturation
        hsva={hsva}
        radius='var(--radius-md)'
        style={{ width: "100%", height: "168px" }}
        onChange={(newColor) => {
          updateColor({ ...hsva, ...newColor, a: 1 });
        }}
      />
      <Hue
        hue={hsva.h}
        height='14px'
        radius='var(--radius-full)'
        style={{ width: "100%" }}
        onChange={(newHue) => {
          updateColor({ ...hsva, ...newHue });
        }}
      />
      <div className={styles.customPickerFooter}>
        <span
          className={styles.customPickerPreview}
          style={{ backgroundColor: pickedHex }}
          aria-hidden='true'
        />
        <Input
          type='text'
          fullWidth
          ariaLabel='Hex color'
          value={hexField}
          onChange={(event) => {
            handleHexInput(event.target.value);
          }}
        />
        <Btn
          variant='brand'
          onClick={() => {
            onApply(pickedHex);
          }}>
          Apply
        </Btn>
      </div>
    </div>
  );
};

export { CustomColorPicker };
