// Hue picker UI backed by @uiw/react-color-block. The theme system stores
// only a hue angle (0–360°) and feeds it into oklch CSS variables, so this
// wrapper translates between Block's hex API and our hue value.
import Block from "@uiw/react-color-block";
import type { ColorResult } from "@uiw/color-convert";
import { hsvaToHex } from "@uiw/color-convert";
import styles from "./ColorPicker.module.css";

// Named hue stops aligned with the design system palette. Saturation/value
// are fixed so the swatches read as vivid, even-weight color chips.
const SWATCH_S = 75;
const SWATCH_V = 90;
const PALETTE_HUES = [
  0, 30, 60, 95, 140, 170, 200, 230, 260, 290, 320, 350,
];

const hueToHex = (hue: number) =>
  hsvaToHex({ h: hue, s: SWATCH_S, v: SWATCH_V, a: 1 });

const PALETTE_HEXES = PALETTE_HUES.map(hueToHex);

interface ColorPickerProps {
  label: string;
  value: number;
  onChange: (hue: number) => void;
}

const ColorPicker = ({ label, value, onChange }: ColorPickerProps) => {
  const currentHex = hueToHex(value);

  const handleChange = (color: ColorResult) => {
    onChange(Math.round(color.hsv.h));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.degrees}>{value}°</span>
      </div>
      <Block
        className={styles.block}
        color={currentHex}
        colors={PALETTE_HEXES}
        onChange={handleChange}
      />
    </div>
  );
};

export { ColorPicker };
