// Color utilities shared across the theme system and color pickers. The app
// stores theme colors as hue angles (0-360) and renders them via oklch() CSS,
// so most helpers here translate between hue, hex, and oklch strings. The
// type guard wraps `hsvaToHex` (which returns a plain `string`) into the
// branded `HexColor` template literal type consumed by ColorPicker/Swatch.
import { hexToHsva, hsvaToHex } from "@uiw/color-convert";
import type { HexColor } from "@uiw/color-convert";

const OKLCH_HUE_RX = /oklch\(\s*[\d.]+\s+[\d.]+\s+(-?[\d.]+)/;
const HEX_RX = /^#[0-9a-fA-F]{3,8}$/;

export function parseHue(color: string): number {
  const oklch = OKLCH_HUE_RX.exec(color);
  if (oklch) {
    const n = Number(oklch[1]);
    return Math.round(((n % 360) + 360) % 360);
  }
  if (HEX_RX.test(color)) {
    return Math.round(hexToHsva(color).h);
  }
  return 0;
}

export function hueToColor(hue: number): string {
  return `oklch(0.65 0.18 ${hue.toString()})`;
}

const SWATCH_S = 75;
const SWATCH_V = 90;
const PALETTE_HUES = [0, 30, 60, 95, 140, 170, 200, 230, 260, 290, 320, 350];

export function hueToHex(hue: number): HexColor {
  return toHexColor(hsvaToHex({ h: hue, s: SWATCH_S, v: SWATCH_V, a: 1 }));
}

export const PALETTE_HEXES = PALETTE_HUES.map(hueToHex);

export const COLOR_CHOICES: HexColor[] = [
  "#000000",
  "#ffffff",
  "#ff2056",
  "#e12afb",
  "#8e51ff",
  "#2b7fff",
  "#00b8db",
  "#00bc7d",
  "#5ea500",
  "#ff8904",
  "#fb64b6",
  "#00bcff",
  "#00d5be",
  "#9ae600",
  "#ffdf20",
];

// Muted, low-saturation tones suited to slide / deck *backgrounds* — the vivid
// COLOR_CHOICES above read as accent/foreground colors and overpower content.
// Soft neutrals, pastels, and a few muted darks (Tailwind 50–300 lights, 600–800
// darks). These are just quick-pick swatches; the picker's hex input still
// accepts any custom color.
export const BACKGROUND_COLOR_CHOICES: HexColor[] = [
  "#ffffff",
  "#f5f5f4",
  "#e7e5e4",
  "#d6d3d1",
  "#fef3c7",
  "#fed7aa",
  "#fecaca",
  "#fbcfe8",
  "#e9d5ff",
  "#c7d2fe",
  "#bfdbfe",
  "#a5f3fc",
  "#bbf7d0",
  "#475569",
  "#1e293b",
];

export function isHexColor(value: string): value is HexColor {
  return /^#([A-Fa-f0-9]{3,4}){1,2}$/.test(value);
}

export function toHexColor(value: string): HexColor {
  if (!isHexColor(value)) {
    throw new Error(`Invalid hex color: ${value}`);
  }
  return value;
}
