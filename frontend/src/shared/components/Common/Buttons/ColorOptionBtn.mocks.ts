// Sample palette for the ColorOptionBtn stories — mirrors the kind of text-color
// row the RichTextInput toolbar offers. The leading empty color is the
// "default / clear" swatch (renders transparent).
export interface ColorSwatch {
  label: string;
  color: string;
}

export const COLOR_PALETTE: ColorSwatch[] = [
  { label: "Default", color: "" },
  { label: "Red", color: "#e74c3c" },
  { label: "Orange", color: "#e67e22" },
  { label: "Yellow", color: "#f1c40f" },
  { label: "Green", color: "#2ecc71" },
  { label: "Blue", color: "#3498db" },
  { label: "Purple", color: "#9b59b6" },
  { label: "Black", color: "#1a1a1a" },
];
