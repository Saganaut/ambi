// Sample content for the Popover stories. Kept as plain data the story maps
// over so the rendered JSX lives in the story, not here.

export interface FormatButtonSpec {
  ariaLabel: string;
  label: string;
  isActive?: boolean;
}

export const formattingButtons: FormatButtonSpec[] = [
  { ariaLabel: "Bold", label: "B", isActive: true },
  { ariaLabel: "Underline", label: "U" },
  { ariaLabel: "Strikethrough", label: "S" },
];

export const fontSizeButtons: FormatButtonSpec[] = [
  { ariaLabel: "Set font size S", label: "S" },
  { ariaLabel: "Set font size M", label: "M", isActive: true },
  { ariaLabel: "Set font size L", label: "L" },
  { ariaLabel: "Set font size XL", label: "XL" },
];

export const menuItems: string[] = ["Edit", "Duplicate", "Delete"];
