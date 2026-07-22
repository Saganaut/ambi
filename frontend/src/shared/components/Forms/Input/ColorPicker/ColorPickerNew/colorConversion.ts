// Dependency-free color math for the new color picker. Replaces the
// conversions we previously leaned on @uiw/color-convert for, plus OKLCH
// support (the design system's primary authored format — see
// z-docs/rules/styling/color-formats.md).
//
// The picker's working model is HSVA: hue 0-360, saturation/value 0-100,
// alpha 0-1. Colors leave the picker as hex — #rrggbb, or #rrggbbaa when
// translucent — because hex is the app's user-input/fallback format.

export interface Hsva {
  h: number;
  s: number;
  v: number;
  a: number;
}

export type HEX = `#${string}`;
export type OKLCH = `oklch(${string})`;
/** A live theme reference, e.g. "var(--role-accent)" — resolves via the cascade. */
export type ThemeVarColor = `var(--${string})`;

/** A concrete, parseable color string. */
export type ColorString = HEX | OKLCH;
/** Anything the picker can display and emit — concrete or live-themed. */
export type ColorValue = ColorString | ThemeVarColor;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// ---------------------------------------------------------------------------
// RGB ↔ HSV
// ---------------------------------------------------------------------------

/** RGB channels 0-255 → HSV (h 0-360, s/v 0-100). */
export function rgbToHsv(r: number, g: number, b: number): Omit<Hsva, "a"> {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (delta / max) * 100;
  return { h, s, v: max * 100 };
}

/** HSV (h 0-360, s/v 0-100) → RGB channels 0-255. */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const sn = clamp(s, 0, 100) / 100;
  const vn = clamp(v, 0, 100) / 100;
  const hn = (((h % 360) + 360) % 360) / 60;
  const c = vn * sn;
  const x = c * (1 - Math.abs((hn % 2) - 1));
  const m = vn - c;
  let rgb: [number, number, number];
  if (hn < 1) rgb = [c, x, 0];
  else if (hn < 2) rgb = [x, c, 0];
  else if (hn < 3) rgb = [0, c, x];
  else if (hn < 4) rgb = [0, x, c];
  else if (hn < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return [
    Math.round((rgb[0] + m) * 255),
    Math.round((rgb[1] + m) * 255),
    Math.round((rgb[2] + m) * 255),
  ];
}

// ---------------------------------------------------------------------------
// Hex ↔ HSVA
// ---------------------------------------------------------------------------

const HEX_RX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Parse #rgb / #rgba / #rrggbb / #rrggbbaa into HSVA; null when malformed. */
export function hexToHsva(hex: string): Hsva | null {
  if (!HEX_RX.test(hex)) return null;
  let body = hex.slice(1);
  if (body.length <= 4) {
    body = body
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  const r = parseInt(body.slice(0, 2), 16);
  const g = parseInt(body.slice(2, 4), 16);
  const b = parseInt(body.slice(4, 6), 16);
  const a = body.length === 8 ? parseInt(body.slice(6, 8), 16) / 255 : 1;
  return { ...rgbToHsv(r, g, b), a };
}

const channelToHex = (channel: number) =>
  clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0");

/** HSVA → #rrggbb, or #rrggbbaa when the alpha channel is meaningful. */
export function hsvaToHex(hsva: Hsva): HEX {
  const [r, g, b] = hsvToRgb(hsva.h, hsva.s, hsva.v);
  const base: HEX = `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
  return hsva.a < 1 ? `${base}${channelToHex(hsva.a * 255)}` : base;
}

/** The pure hue at full saturation/value, e.g. for slider/field backdrops. */
export function hueToPureHex(hue: number): string {
  const [r, g, b] = hsvToRgb(hue, 100, 100);
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}

// ---------------------------------------------------------------------------
// OKLCH → HSVA
// ---------------------------------------------------------------------------

// oklch(L C H) with optional "/ alpha"; L and alpha accept % or number.
const OKLCH_RX =
  /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+(-?[\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+%?)\s*)?\)$/i;

const parseNumberOrPercent = (raw: string, percentScale: number) =>
  raw.endsWith("%") ? (parseFloat(raw) / 100) * percentScale : parseFloat(raw);

// OKLab → linear sRGB per the reference matrices (bottereau/Björn Ottosson).
const gammaEncode = (channel: number) =>
  channel <= 0.0031308
    ? 12.92 * channel
    : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;

function oklchToRgb(l: number, c: number, hDeg: number): [number, number, number] {
  const hRad = (hDeg * Math.PI) / 180;
  const labA = c * Math.cos(hRad);
  const labB = c * Math.sin(hRad);

  const l_ = Math.pow(l + 0.3963377774 * labA + 0.2158037573 * labB, 3);
  const m_ = Math.pow(l - 0.1055613458 * labA - 0.0638541728 * labB, 3);
  const s_ = Math.pow(l - 0.0894841775 * labA - 1.291485548 * labB, 3);

  const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
  const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
  const b = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;

  return [
    Math.round(clamp(gammaEncode(r), 0, 1) * 255),
    Math.round(clamp(gammaEncode(g), 0, 1) * 255),
    Math.round(clamp(gammaEncode(b), 0, 1) * 255),
  ];
}

/** Parse an oklch(...) string into HSVA; null when malformed. */
export function oklchToHsva(value: string): Hsva | null {
  const match = OKLCH_RX.exec(value.trim());
  if (!match) return null;
  const l = parseNumberOrPercent(match[1], 1);
  const c = parseFloat(match[2]);
  const h = parseFloat(match[3]);
  const a = match[4] != null ? parseNumberOrPercent(match[4], 1) : 1;
  const [r, g, b] = oklchToRgb(l, c, h);
  return { ...rgbToHsv(r, g, b), a: clamp(a, 0, 1) };
}

// ---------------------------------------------------------------------------
// Any supported color string → HSVA
// ---------------------------------------------------------------------------

// rgb(r, g, b) / rgba(r, g, b, a) / rgb(r g b / a) — what getComputedStyle
// serializes sRGB colors to, so resolved theme-variable swatches parse too.
const RGB_RX =
  /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i;

// color(srgb r g b / a) with channels 0-1 — the other serialization browsers
// use for computed colors that started life outside legacy sRGB syntax.
const COLOR_SRGB_RX =
  /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i;

/** Narrows an untrusted value (e.g. read back from localStorage) to ColorValue. */
export function isColorValue(value: unknown): value is ColorValue {
  return (
    typeof value === "string" &&
    (value.startsWith("#") || /^oklch\(/i.test(value) || value.startsWith("var(--"))
  );
}

/**
 * Best-effort parse of a color string — hex, oklch(...), or a serialized
 * rgb()/rgba()/color(srgb …) computed value. Returns null for anything
 * unresolvable (e.g. a live var(--role-*) reference).
 */
export function parseColor(value: string): Hsva | null {
  const trimmed = value.trim();
  if (trimmed.startsWith("#")) return hexToHsva(trimmed);
  if (/^oklch/i.test(trimmed)) return oklchToHsva(trimmed);
  const rgb = RGB_RX.exec(trimmed);
  if (rgb) {
    const a = rgb[4] != null ? parseNumberOrPercent(rgb[4], 1) : 1;
    return {
      ...rgbToHsv(Number(rgb[1]), Number(rgb[2]), Number(rgb[3])),
      a: clamp(a, 0, 1),
    };
  }
  const srgb = COLOR_SRGB_RX.exec(trimmed);
  if (srgb) {
    const a = srgb[4] != null ? parseNumberOrPercent(srgb[4], 1) : 1;
    return {
      ...rgbToHsv(
        Math.round(clamp(Number(srgb[1]), 0, 1) * 255),
        Math.round(clamp(Number(srgb[2]), 0, 1) * 255),
        Math.round(clamp(Number(srgb[3]), 0, 1) * 255),
      ),
      a: clamp(a, 0, 1),
    };
  }
  return null;
}
