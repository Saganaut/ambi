// Color utilities shared outside the DS color picker. Conversion math lives
// in the picker's dependency-free colorConversion.ts; what remains here are
// the app-level display heuristics.

const HEX_RX = /^#[0-9a-fA-F]{3,8}$/;

export type ContrastTone = "light" | "dark";

// Parse a #rgb / #rrggbb hex (with optional alpha, which is ignored) into 0-255
// RGB channels. Returns null for anything that isn't a well-formed opaque/alpha
// hex — callers treat that as "unknown background" and fall back.
function hexToRgb(hex: string): [number, number, number] | null {
  if (!HEX_RX.test(hex)) return null;
  let body = hex.slice(1);
  // Expand shorthand (#rgb / #rgba) to full form so slicing is uniform.
  if (body.length === 3 || body.length === 4) {
    body = body
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (body.length !== 6 && body.length !== 8) return null;
  return [
    parseInt(body.slice(0, 2), 16),
    parseInt(body.slice(2, 4), 16),
    parseInt(body.slice(4, 6), 16),
  ];
}

// Linearise one sRGB channel (0-1) per the WCAG 2.x relative-luminance formula.
function linearise(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/**
 * Which text tone — `"light"` or `"dark"` — reads best on top of a solid
 * background color. Uses WCAG relative luminance with the 0.179 black/white flip
 * point: above it the background is bright enough that dark text wins the
 * contrast ratio, below it light text wins. Non-hex / unparseable input falls
 * back to `"dark"` (assume a light surface). Only meaningful for solid colors —
 * background *images* can't be reduced to one luminance, so callers scrim those
 * instead of calling this.
 */
export function contrastToneFor(color: string): ContrastTone {
  const rgb = hexToRgb(color);
  if (!rgb) return "dark";
  const [r, g, b] = rgb.map((c) => linearise(c / 255));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.179 ? "dark" : "light";
}
